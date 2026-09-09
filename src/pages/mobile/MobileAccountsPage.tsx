import { CountMoney } from "../../components/CountMoney";
import { Icon, type IconName } from "../../components/Icon";
import { EmptyState, ErrorState, LoadingState } from "../../components/Status";
import { useAccounts } from "../../hooks/useAccounts";
import { useHiddenBalance } from "../../hooks/useHiddenBalance";
import { useLanguage } from "../../hooks/useLanguage";
import { localizeName } from "../../i18n/localize";
import type { AccountType } from "../../types/database";

function accountIcon(type: AccountType): IconName {
  if (type === "card") return "card";
  if (type === "bank") return "accounts";
  return "wallet";
}

export function MobileAccountsPage() {
  const { t } = useLanguage();
  const { hidden, toggle } = useHiddenBalance();
  const { data: accounts, loading, error, reload } = useAccounts();
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  if (loading) return <LoadingState message={t("common.loading")} />;
  if (error) return <ErrorState title={t("error.retryTitle")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} />;

  return (
    <div className="mobile-stack">
      <header className="mobile-page-head">
        <h1>{t("nav.accounts")}</h1>
        <button type="button" className="eye-btn" onClick={toggle} aria-label={hidden ? t("dash.showBalance") : t("dash.hideBalance")}>
          <Icon name={hidden ? "eyeOff" : "eye"} />
        </button>
      </header>

      {accounts.length === 0 ? (
        <EmptyState title={t("acc.emptyTitle")} message={t("acc.emptyBody")} icon="accounts" />
      ) : (
        <section className="mobile-accounts tall">
          {accounts.map((account) => (
            <article key={account.id}>
              <span><Icon name={accountIcon(account.type)} />{localizeName(account.name, t)}</span>
              <strong><CountMoney value={account.balance} hidden={hidden} /></strong>
              <small>
                {account.type === "cash"
                  ? t("acc.cash")
                  : account.type === "bank"
                    ? t("acc.bank")
                    : account.type === "card"
                      ? t("acc.card")
                      : t("acc.wallet")}
              </small>
            </article>
          ))}
          <div className="mobile-accounts-total">
            <span>{t("acc.totalAvailable")}</span>
            <strong><CountMoney value={total} hidden={hidden} /></strong>
          </div>
        </section>
      )}
    </div>
  );
}
