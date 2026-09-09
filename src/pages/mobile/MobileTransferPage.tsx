import { useState } from "react";
import { TransferForm } from "../../components/forms/TransferForm";
import { ErrorState, LoadingState } from "../../components/Status";
import { useAccounts } from "../../hooks/useAccounts";
import { useLanguage } from "../../hooks/useLanguage";
import { useToast } from "../../hooks/useToast";
import { createTransfer } from "../../services/ledger";

export function MobileTransferPage() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const { data: accounts, loading, error, reload } = useAccounts();
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState message={t("common.loading")} />;
  if (error) return <ErrorState title={t("error.retryTitle")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} />;

  return (
    <div className="mobile-stack">
      <header className="mobile-page-head">
        <div>
          <h1>{t("transfer.title")}</h1>
          <p className="muted">{t("transfer.body")}</p>
        </div>
      </header>
      <section className="panel">
        <TransferForm
          accounts={accounts}
          submitting={submitting}
          onSubmit={async (values) => {
            setSubmitting(true);
            try {
              await createTransfer(values);
              notify(t("toast.transferDone"));
              reload();
            } catch (err) {
              notify(err instanceof Error ? err.message : t("error.retryBody"), "error");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </section>
    </div>
  );
}
