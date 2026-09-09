import { Icon } from "./Icon";
import { useLanguage } from "../hooks/useLanguage";
import type { HealthResult } from "../utils/insights";

export function FinancialHealthCard({ health }: { health: HealthResult }) {
  const { t } = useLanguage();
  return (
    <article className={`health-card health-${health.status}`}>
      <div className="health-copy">
        <span className="health-kicker"><Icon name="keep" />{t("health.title")}</span>
        {health.ready ? <strong>{t("health.outOf", { score: health.score })}</strong> : <strong>—</strong>}
        <em>{health.ready ? t(health.statusKey) : t("health.fair")}</em>
        <p>{t(health.explainKey)}</p>
      </div>
      <div className="health-ring" aria-hidden="true">
        <svg viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="28" className="health-track" />
          <circle
            cx="36"
            cy="36"
            r="28"
            className="health-fill"
            strokeDasharray={`${((health.ready ? health.score : 0) / 100) * 176} 176`}
          />
        </svg>
        <b>{health.ready ? health.score : "—"}</b>
      </div>
    </article>
  );
}
