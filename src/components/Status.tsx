import { Icon, type IconName } from "./Icon";
import { useLanguage } from "../hooks/useLanguage";
import { localizeError } from "../i18n/localize";

type StatusProps = {
  title: string;
  message?: string;
  icon?: IconName;
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

export function EmptyState({ title, message, icon = "wallet", action }: StatusProps) {
  return (
    <div className="status-block">
      <div className="placeholder-icon"><Icon name={icon} /></div>
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
      <div className="placeholder-icon"><Icon name="spark" /></div>
      <h3>{title || t("error.retryTitle")}</h3>
      <p>{message ? localizeError(message, t) : t("error.retryBody")}</p>
      {action ? (
        <button className="ghost-btn bordered" onClick={action.onClick}>{action.label ?? t("common.tryAgain")}</button>
      ) : null}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-wrap dashboard-stack" aria-hidden="true">
      <div className="skeleton hero-skel" />
      <div className="skeleton-row">
        <div className="skeleton skel-btn" />
        <div className="skeleton skel-btn" />
        <div className="skeleton skel-btn" />
        <div className="skeleton skel-btn" />
      </div>
      <div className="skeleton-row four">
        <div className="skeleton skel-card" />
        <div className="skeleton skel-card" />
        <div className="skeleton skel-card" />
        <div className="skeleton skel-card" />
      </div>
      <div className="skeleton skel-wide" />
      <div className="skeleton skel-wide" />
    </div>
  );
}
