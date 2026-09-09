import { useLanguage } from "../hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { preferredHomePath } from "../hooks/useMediaQuery";

export function HelpPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="panel help-panel">
      <div className="panel-head">
        <div>
          <h2>{t("help.title")}</h2>
          <p>{t("help.body")}</p>
        </div>
        <button
          type="button"
          className="ghost-btn bordered"
          onClick={() => navigate(preferredHomePath(), { state: { openWelcome: true } })}
        >
          <Icon name="help" />
          {t("help.openWelcome")}
        </button>
      </div>
      <div className="help-grid">
        <article>
          <h3>{t("help.1")}</h3>
          <p>{t("help.1b")}</p>
        </article>
        <article>
          <h3>{t("help.2")}</h3>
          <p>{t("help.2b")}</p>
        </article>
        <article>
          <h3>{t("help.3")}</h3>
          <p>{t("help.3b")}</p>
        </article>
        <article>
          <h3>{t("help.4")}</h3>
          <p>{t("help.4b")}</p>
        </article>
        <article>
          <h3>{t("help.5")}</h3>
          <p>{t("help.5b")}</p>
        </article>
        <article>
          <h3>{t("help.6")}</h3>
          <p>{t("help.6b")}</p>
        </article>
      </div>
    </section>
  );
}
