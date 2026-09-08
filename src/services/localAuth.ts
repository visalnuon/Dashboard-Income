import type { Profile } from "../types/database";

const USERS_KEY = "visal-local-users";
const SESSION_KEY = "visal-demo-auth";

export const DEMO_USERNAME = "admin";
export const DEMO_PASSWORD = "admin 123";
export const DEMO_USER_ID = "demo-admin";

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type LocalAccount = {
  id: string;
  username: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
};

export type LocalSession = {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  token?: string;
};

export type ManagedUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  builtIn: boolean;
};

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function normalizeRole(value?: string | null): UserRole {
  return value === "admin" ? "admin" : "user";
}

export function toProfile(account: {
  id: string;
  username: string;
  fullName: string;
  role?: UserRole;
  createdAt?: string;
}): Profile {
  const stamp = account.createdAt ?? new Date().toISOString();
  return {
    id: account.id,
    full_name: account.fullName,
    email: account.username,
    avatar_url: null,
    role: account.role ?? "user",
    created_at: stamp,
    updated_at: stamp,
  };
}

export const DEMO_PROFILE = toProfile({
  id: DEMO_USER_ID,
  username: DEMO_USERNAME,
  fullName: "visal_finance",
  role: "admin",
});

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function readUsers(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalAccount[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((user) => ({
      ...user,
      role: normalizeRole(user.role),
    }));
  } catch {
    return [];
  }
}

function writeUsers(users: LocalAccount[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function findLocalUserById(userId: string) {
  return readUsers().find((user) => user.id === userId) ?? null;
}

export async function createLocalUser(values: {
  fullName: string;
  username: string;
  password: string;
  role?: UserRole;
}) {
  const username = normalizeUsername(values.username);
  if (username === DEMO_USERNAME || readUsers().some((user) => user.username === username)) {
    throw new Error("That username is already taken.");
  }
  const account: LocalAccount = {
    id: crypto.randomUUID(),
    username,
    fullName: values.fullName.trim(),
    passwordHash: await hashPassword(values.password),
    role: normalizeRole(values.role),
    createdAt: new Date().toISOString(),
  };
  writeUsers([...readUsers(), account]);
  return account;
}

export function listManagedUsers(): ManagedUser[] {
  const builtIn: ManagedUser = {
    id: DEMO_USER_ID,
    username: DEMO_USERNAME,
    fullName: DEMO_PROFILE.full_name ?? "visal_finance",
    role: "admin",
    createdAt: DEMO_PROFILE.created_at,
    builtIn: true,
  };
  const locals = readUsers().map((user) => ({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: normalizeRole(user.role),
    createdAt: user.createdAt,
    builtIn: false,
  }));
  return [builtIn, ...locals];
}

export async function updateLocalUserRole(userId: string, role: UserRole) {
  if (userId === DEMO_USER_ID) throw new Error("You cannot change the built-in admin role.");
  const users = readUsers();
  const account = users.find((user) => user.id === userId);
  if (!account) throw new Error("User not found.");
  account.role = normalizeRole(role);
  writeUsers(users);
  const session = readLocalSession();
  if (session?.userId === userId) {
    patchLocalSession({ ...session, role: account.role, fullName: account.fullName, username: account.username });
  }
  return toManagedUser(account);
}

export function deleteLocalUser(userId: string, currentUserId?: string) {
  if (userId === DEMO_USER_ID) throw new Error("You cannot delete this account.");
  if (currentUserId && userId === currentUserId) throw new Error("You cannot delete your own account.");
  const users = readUsers();
  if (!users.some((user) => user.id === userId)) throw new Error("User not found.");
  writeUsers(users.filter((user) => user.id !== userId));
}

function toManagedUser(account: LocalAccount): ManagedUser {
  return {
    id: account.id,
    username: account.username,
    fullName: account.fullName,
    role: normalizeRole(account.role),
    createdAt: account.createdAt,
    builtIn: false,
  };
}

export async function authenticateLocalUser(username: string, password: string) {
  const account = readUsers().find((user) => user.username === normalizeUsername(username));
  if (!account) return null;
  const hash = await hashPassword(password);
  return hash === account.passwordHash ? account : null;
}

export async function updateLocalUser(
  userId: string,
  values: { fullName?: string; password?: string; role?: UserRole },
) {
  if (userId === DEMO_USER_ID) return findLocalSessionProfile();
  const users = readUsers();
  const account = users.find((user) => user.id === userId);
  if (!account) throw new Error("You need to be signed in.");
  if (values.fullName != null) account.fullName = values.fullName.trim();
  if (values.password) account.passwordHash = await hashPassword(values.password);
  if (values.role) account.role = normalizeRole(values.role);
  writeUsers(users);
  const current = readLocalSession();
  patchLocalSession({
    username: account.username,
    fullName: account.fullName,
    userId: account.id,
    role: account.role,
    token: current?.token,
  });
  return toProfile(account);
}

function serializeSession(session: LocalSession) {
  return JSON.stringify(session);
}

function parseSession(raw: string | null): LocalSession | null {
  if (!raw) return null;
  if (raw === "1") {
    return {
      userId: DEMO_USER_ID,
      username: DEMO_USERNAME,
      fullName: DEMO_PROFILE.full_name ?? "visal_finance",
      role: "admin",
    };
  }
  try {
    const parsed = JSON.parse(raw) as LocalSession;
    if (parsed?.userId && parsed.username) {
      const account = parsed.userId === DEMO_USER_ID ? null : findLocalUserById(parsed.userId);
      return {
        userId: parsed.userId,
        username: parsed.username,
        fullName: parsed.fullName,
        role: parsed.userId === DEMO_USER_ID ? "admin" : normalizeRole(account?.role ?? parsed.role),
        token: parsed.token,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function readLocalSession(): LocalSession | null {
  return parseSession(localStorage.getItem(SESSION_KEY)) ?? parseSession(sessionStorage.getItem(SESSION_KEY));
}

export function writeLocalSession(session: LocalSession, remember: boolean) {
  clearLocalSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(SESSION_KEY, serializeSession(session));
}

export function patchLocalSession(session: LocalSession) {
  if (localStorage.getItem(SESSION_KEY) != null) {
    localStorage.setItem(SESSION_KEY, serializeSession(session));
  }
  if (sessionStorage.getItem(SESSION_KEY) != null) {
    sessionStorage.setItem(SESSION_KEY, serializeSession(session));
  }
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function getLocalAuthUserId() {
  return readLocalSession()?.userId ?? "local-user";
}

export function localSessionToProfile(session: LocalSession | null): Profile | null {
  if (!session) return null;
  if (session.userId === DEMO_USER_ID) return DEMO_PROFILE;
  const account = findLocalUserById(session.userId);
  return account
    ? toProfile(account)
    : toProfile({
        id: session.userId,
        username: session.username,
        fullName: session.fullName,
        role: session.role,
      });
}

function findLocalSessionProfile() {
  return localSessionToProfile(readLocalSession());
}

export function isDemoLogin(username: string, password: string) {
  const user = normalizeUsername(username);
  const pass = password.trim();
  return user === DEMO_USERNAME && (pass === DEMO_PASSWORD || pass.replace(/\s+/g, "") === "admin123");
}

export function readDemoSession() {
  return Boolean(readLocalSession());
}

export function writeDemoSession(remember: boolean) {
  writeLocalSession(
    {
      userId: DEMO_USER_ID,
      username: DEMO_USERNAME,
      fullName: DEMO_PROFILE.full_name ?? "visal_finance",
      role: "admin",
    },
    remember,
  );
}

export function clearDemoSession() {
  clearLocalSession();
}

export function demoSessionFromLogin() {
  return {
    userId: DEMO_USER_ID,
    username: DEMO_USERNAME,
    fullName: DEMO_PROFILE.full_name ?? "visal_finance",
    role: "admin",
  } satisfies LocalSession;
}

const NEXT_PATH_KEY = "visal-post-auth-path";

export function setPostAuthPath(path: string) {
  sessionStorage.setItem(NEXT_PATH_KEY, path);
}

export function readPostAuthPath(fallback = "/dashboard") {
  return sessionStorage.getItem(NEXT_PATH_KEY) || fallback;
}

export function clearPostAuthPath() {
  sessionStorage.removeItem(NEXT_PATH_KEY);
}
