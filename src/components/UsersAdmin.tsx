import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { SelectField, TextField } from "./Field";
import { LoadingState } from "./Status";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { localizeError } from "../i18n/localize";
import { canUseCloudUsers } from "../services/cloudUsers";
import { USER_ROLES, type ManagedUser, type UserRole } from "../services/localAuth";
import { validateRegister, type FieldErrors } from "../utils/validation";

export function UsersAdmin() {
  const { createUser, listUsers, updateUserRole, deleteUser, profile, cloudSynced } = useAuth();
  const { t, te } = useLanguage();
  const { notify } = useToast();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const cloudEnabled = canUseCloudUsers();

  const currentId = profile?.id;

  async function refresh() {
    setLoadingUsers(true);
    try {
      setUsers(await listUsers());
    } catch (error) {
      notify(error instanceof Error ? localizeError(error.message, t) : t("toast.generic"), "error");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const nextErrors = te(validateRegister({ fullName, username, password }));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createUser(fullName.trim(), username.trim(), password, role);
      setFullName("");
      setUsername("");
      setPassword("");
      setRole("user");
      await refresh();
      notify(t("toast.userCreated"));
    } catch (error) {
      notify(error instanceof Error ? localizeError(error.message, t) : t("toast.registerFail"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRole(userId: string, nextRole: string) {
    if (nextRole !== "admin" && nextRole !== "user") return;
    try {
      await updateUserRole(userId, nextRole);
      await refresh();
      notify(t("toast.roleUpdated"));
    } catch (error) {
      notify(error instanceof Error ? localizeError(error.message, t) : t("toast.generic"), "error");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteUser(deleting.id);
      setDeleting(null);
      await refresh();
      notify(t("toast.userDeleted"));
    } catch (error) {
      notify(error instanceof Error ? localizeError(error.message, t) : t("toast.generic"), "error");
    }
  }

  const rows = useMemo(() => users, [users]);

  return (
    <section className="panel wide-panel">
      <div className="panel-head">
        <div>
          <h2>{t("settings.users")}</h2>
          <p>{cloudSynced ? t("settings.usersCloud") : cloudEnabled ? t("settings.needRelogin") : t("settings.usersLocal")}</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="form-grid users-form">
        <TextField
          label={t("auth.fullName")}
          value={fullName}
          error={errors.fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <TextField
          label={t("auth.username")}
          value={username}
          autoComplete="off"
          error={errors.username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <TextField
          label={t("auth.password")}
          type="password"
          value={password}
          autoComplete="new-password"
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <SelectField label={t("settings.role")} value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          {USER_ROLES.map((item) => (
            <option key={item} value={item}>{t(item === "admin" ? "settings.roleAdmin" : "settings.roleUser")}</option>
          ))}
        </SelectField>
        <button className="primary-btn wide" type="submit" disabled={submitting || (cloudEnabled && !cloudSynced)}>
          {submitting ? t("auth.creating") : t("auth.createUser")}
        </button>
      </form>

      {loadingUsers ? <LoadingState message={t("settings.loadingUsers")} /> : (
      <div className="table users-table">
        <div className="table-row table-header">
          <span>{t("auth.fullName")}</span>
          <span>{t("auth.username")}</span>
          <span>{t("settings.role")}</span>
          <span />
        </div>
        {rows.map((user) => (
          <div className="table-row" key={user.id}>
            <strong>{user.fullName}</strong>
            <span>{user.username}</span>
            <select
              value={user.role}
              disabled={user.builtIn}
              onChange={(event) => void handleRole(user.id, event.target.value)}
              aria-label={t("settings.role")}
            >
              {USER_ROLES.map((item) => (
                <option key={item} value={item}>{t(item === "admin" ? "settings.roleAdmin" : "settings.roleUser")}</option>
              ))}
            </select>
            <div className="row-actions">
              {user.builtIn || user.id === currentId ? (
                <span className="muted">{user.builtIn ? t("settings.builtIn") : t("settings.you")}</span>
              ) : (
                <button type="button" className="ghost-btn danger" onClick={() => setDeleting(user)}>
                  {t("common.delete")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {deleting ? (
        <ConfirmDialog
          title={t("settings.deleteUserTitle")}
          message={t("settings.deleteUserMsg", { name: deleting.fullName || deleting.username })}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}
    </section>
  );
}
