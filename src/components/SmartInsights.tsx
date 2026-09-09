import { Icon } from "./Icon";
import { useLanguage } from "../hooks/useLanguage";
import type { InsightItem } from "../utils/insights";

export function SmartInsights({ items }: { items: InsightItem[] }) {
  const { t } = useLanguage();
  return (
    <section className="panel insights-panel">
      <div className="panel-head">
        <div>
          <h2>{t("insight.title")}</h2>
          <p>{t("insight.body")}</p>
        </div>
      </div>
      <ul className="insight-list">
        {items.map((item) => (
          <li key={item.titleKey}>
            <span className="insight-icon"><Icon name={item.icon} /></span>
            <div>
              <strong>{t(item.titleKey)}</strong>
              <p>{t(item.bodyKey, item.vars)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
