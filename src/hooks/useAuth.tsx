import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { ensureProfile, signIn, signOut, signUp, updatePassword, updateProfile } from "../services/auth";
import {
  authenticateLocalUser,
  clearLocalSession,
  createLocalUser,
  deleteLocalUser,
  DEMO_PROFILE,
  DEMO_USER_ID,
  demoSessionFromLogin,
  isDemoLogin,
  listManagedUsers,
  localSessionToProfile,
  normalizeRole,
  patchLocalSession,
  readLocalSession,
  updateLocalUser,
  updateLocalUserRole,
  writeLocalSession,
  type LocalSession,
  type ManagedUser,
  type UserRole,
} from "../services/localAuth";
import {
  canUseCloudUsers,
  cloudDeleteUser,
  cloudListUsers,
  cloudLogin,
  cloudRegister,
  cloudUpdateName,
  cloudUpdatePassword,
  cloudUpdateUserRole,
} from "../services/cloudUsers";
import { resetFinanceCache } from "../services/localFinance";
import type { Profile } from "../types/database";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  isAuthed: boolean;
  role: UserRole;
  isAdmin: boolean;
  cloudSynced: boolean;
  signIn: (username: string, password: string, remember?: boolean) => Promise<void>;
  signUp: (fullName: string, username: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  createUser: (fullName: string, username: string, password: string, role: UserRole) => Promise<ManagedUser>;
  listUsers: () => Promise<ManagedUser[]>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateName: (fullName: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [localUser, setLocalUser] = useState<LocalSession | null>(readLocalSession);
  const [loading, setLoading] = useState(() => isSupabaseConfigured);

  const applyLocalSession = useCallback((next: LocalSession | null) => {
    resetFinanceCache();
    setLocalUser(next);
    setProfile(localSessionToProfile(next));
  }, []);

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(localSessionToProfile(readLocalSession()));
      return;
    }
    const next = await ensureProfile(
      currentUser.id,
      currentUser.email,
      typeof currentUser.user_metadata.full_name === "string" ? currentUser.user_metadata.full_name : null,
    );
    setProfile(next);
  }, []);

  useEffect(() => {
    const local = readLocalSession();
    applyLocalSession(local);

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadProfile(data.session?.user ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [applyLocalSession, loadProfile]);

  const value = useMemo<AuthContextValue>(() => {
    const role: UserRole = localUser?.userId === DEMO_USER_ID
      ? "admin"
      : normalizeRole(localUser?.role ?? profile?.role);
    const isAdmin = role === "admin";

    function requireAdmin() {
      if (!isAdmin) throw new Error("Only an admin can manage users.");
    }

    return {
      session,
      user: session?.user ?? null,
      profile: profile ?? localSessionToProfile(localUser),
      loading,
      configured: isSupabaseConfigured,
      isAuthed: Boolean(session) || Boolean(localUser) || Boolean(readLocalSession()),
      role,
      isAdmin,
      cloudSynced: canUseCloudUsers() && Boolean(localUser?.token),
      signIn: async (username, password, remember = true) => {
        if (isDemoLogin(username, password)) {
          const next: LocalSession = { ...demoSessionFromLogin() };
          if (canUseCloudUsers()) {
            try {
              const cloud = await cloudLogin(username, password);
              next.token = cloud.token;
            } catch {
              // Cloud is optional for the built-in admin login.
            }
          }
          writeLocalSession(next, remember);
          applyLocalSession(next);
          return;
        }
        if (canUseCloudUsers()) {
          try {
            const cloud = await cloudLogin(username, password);
            const next: LocalSession = {
              userId: cloud.id,
              username: cloud.username,
              fullName: cloud.fullName,
              role: cloud.role,
              token: cloud.token,
            };
            writeLocalSession(next, remember);
            applyLocalSession(next);
            return;
          } catch (error) {
            if (!(error instanceof Error) || error.message !== "Incorrect username or password.") {
              throw error;
            }
          }
        }
        const local = await authenticateLocalUser(username, password);
        if (local) {
          const next: LocalSession = {
            userId: local.id,
            username: local.username,
            fullName: local.fullName,
            role: normalizeRole(local.role),
          };
          writeLocalSession(next, remember);
          applyLocalSession(next);
          return;
        }
        if (isSupabaseConfigured) {
          await signIn(username.trim(), password);
          return;
        }
        throw new Error("Incorrect username or password.");
      },
      signUp: async (fullName, username, password) => {
        if (canUseCloudUsers()) {
          const cloud = await cloudRegister({ fullName, username, password, role: "user" });
          const next: LocalSession = {
            userId: cloud.id,
            username: cloud.username,
            fullName: cloud.fullName,
            role: cloud.role,
            token: cloud.token,
          };
          writeLocalSession(next, true);
          applyLocalSession(next);
          return { needsConfirmation: false };
        }
        if (isSupabaseConfigured && username.includes("@")) {
          const result = await signUp(fullName, username.trim(), password);
          return { needsConfirmation: !result.session };
        }
        const account = await createLocalUser({ fullName, username, password, role: "user" });
        const next: LocalSession = {
          userId: account.id,
          username: account.username,
          fullName: account.fullName,
          role: account.role,
        };
        writeLocalSession(next, true);
        applyLocalSession(next);
        return { needsConfirmation: false };
      },
      createUser: async (fullName, username, password, nextRole) => {
        requireAdmin();
        if (canUseCloudUsers()) {
          if (!localUser?.token) throw new Error("Sign out and sign in again to load cloud users.");
          const cloud = await cloudRegister({
            fullName,
            username,
            password,
            role: nextRole,
            adminToken: localUser.token,
          });
          return {
            id: cloud.id,
            username: cloud.username,
            fullName: cloud.fullName,
            role: cloud.role,
            createdAt: cloud.createdAt,
            builtIn: false,
          };
        }
        const account = await createLocalUser({ fullName, username, password, role: nextRole });
        return {
          id: account.id,
          username: account.username,
          fullName: account.fullName,
          role: account.role,
          createdAt: account.createdAt,
          builtIn: false,
        };
      },
      listUsers: async () => {
        requireAdmin();
        const builtin = listManagedUsers().filter((user) => user.builtIn);
        if (canUseCloudUsers()) {
          if (!localUser?.token) throw new Error("Sign out and sign in again to load cloud users.");
          const cloud = await cloudListUsers(localUser.token);
          return [...builtin, ...cloud];
        }
        return listManagedUsers();
      },
      updateUserRole: async (userId, nextRole) => {
        requireAdmin();
        if (canUseCloudUsers()) {
          if (!localUser?.token) throw new Error("Sign out and sign in again to load cloud users.");
          if (userId === DEMO_USER_ID) throw new Error("You cannot change the built-in admin role.");
          const updated = await cloudUpdateUserRole(localUser.token, userId, nextRole);
          if (localUser.userId === userId) {
            const next = { ...localUser, role: updated.role };
            patchLocalSession(next);
            applyLocalSession(next);
          }
          return;
        }
        const updated = await updateLocalUserRole(userId, nextRole);
        if (localUser?.userId === userId) {
          applyLocalSession({ ...localUser, role: updated.role });
        }
      },
      deleteUser: async (userId) => {
        requireAdmin();
        if (canUseCloudUsers()) {
          if (!localUser?.token) throw new Error("Sign out and sign in again to load cloud users.");
          await cloudDeleteUser(localUser.token, userId);
          return;
        }
        deleteLocalUser(userId, localUser?.userId);
      },
      signOut: async () => {
        clearLocalSession();
        applyLocalSession(null);
        if (isSupabaseConfigured) await signOut();
      },
      refreshProfile: async () => {
        await loadProfile(session?.user ?? null);
      },
      updateName: async (fullName) => {
        if (localUser && !session?.user) {
          if (canUseCloudUsers() && localUser.token) {
            const cloud = await cloudUpdateName(localUser.token, fullName);
            const next = { ...localUser, fullName: cloud.fullName };
            patchLocalSession(next);
            applyLocalSession(next);
            return;
          }
          if (localUser.userId === DEMO_USER_ID) {
            const next = { ...localUser, fullName };
            patchLocalSession(next);
            applyLocalSession(next);
            setProfile({ ...DEMO_PROFILE, full_name: fullName });
            return;
          }
          const next = await updateLocalUser(localUser.userId, { fullName });
          applyLocalSession({ ...localUser, fullName });
          if (next) setProfile(next);
          return;
        }
        if (!session?.user) throw new Error("You need to be signed in.");
        const next = await updateProfile(session.user.id, { full_name: fullName });
        setProfile(next);
      },
      changePassword: async (password) => {
        if (localUser && !session?.user) {
          if (canUseCloudUsers() && localUser.token) {
            await cloudUpdatePassword(localUser.token, password);
            return;
          }
          if (localUser.userId === DEMO_USER_ID) return;
          await updateLocalUser(localUser.userId, { password });
          return;
        }
        await updatePassword(password);
      },
    };
  }, [session, profile, loading, localUser, loadProfile, applyLocalSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
