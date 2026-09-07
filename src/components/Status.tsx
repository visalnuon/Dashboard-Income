import { useLanguage } from "../hooks/useLanguage";
import { localizeError } from "../i18n/localize";

type StatusProps = {
  title: string;
  message?: string;
  icon?: string;
  action?: { label: string; onClick: () => void };
};

export function LoadingState({ message }: { message?: string }) {
  const { t } = useLanguage();
  return (
    <div className="status-block">
      <div className="spinner" />
      <p>{message ?? t("common.loading")}</p>
    </div>
  );
}

export function EmptyState({ title, message, icon = "◈", action }: StatusProps) {
  return (
    <div className="status-block">
      <div className="placeholder-icon">{icon}</div>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action ? (
        <button className="primary-btn" onClick={action.onClick}>{action.label}</button>
      ) : null}
    </div>
  );
}

export function ErrorState({ title, message, action }: StatusProps) {
  const { t } = useLanguage();
  return (
    <div className="status-block error">
      <div className="placeholder-icon">!</div>
      <h3>{title}</h3>
      {message ? <p>{localizeError(message, t)}</p> : null}
      {action ? (
        <button className="ghost-btn bordered" onClick={action.onClick}>{action.label}</button>
      ) : null}
    </div>
  );
}
