import { useState, type FormEvent } from "react";
import type { Account, AccountType } from "../../types/database";
import { validateAccount, type FieldErrors } from "../../utils/validation";
import { useLanguage } from "../../hooks/useLanguage";
import { SelectField, TextField } from "../Field";

type AccountFormProps = {
  initial?: Account | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string; type: AccountType; balance?: number }) => Promise<void>;
};

export function AccountForm({ initial, submitting, onCancel, onSubmit }: AccountFormProps) {
  const { t, te } = useLanguage();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "cash");
  const [balance, setBalance] = useState(initial ? String(initial.balance) : "0");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = te(validateAccount({ name, type, balance: initial ? "0" : balance }));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({
      name: name.trim(),
      type,
      ...(initial ? {} : { balance: Number(balance || 0) }),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <TextField label={t("form.name")} value={name} error={errors.name} placeholder={t("form.accountPlaceholder")} onChange={(event) => setName(event.target.value)} />
        <SelectField label={t("form.type")} value={type} error={errors.type} onChange={(event) => setType(event.target.value as AccountType)}>
          <option value="cash">{t("acc.cash")}</option>
          <option value="bank">{t("acc.bank")}</option>
          <option value="card">{t("acc.card")}</option>
          <option value="wallet">{t("acc.wallet")}</option>
        </SelectField>
        {!initial ? (
          <TextField
            label={t("form.openingBalance")}
            type="number"
            step="0.01"
            value={balance}
            error={errors.balance}
            onChange={(event) => setBalance(event.target.value)}
          />
        ) : (
          <p className="wide form-hint">{t("form.balanceHint")}</p>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="ghost-btn bordered" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? t("common.saving") : initial ? t("form.saveAccount") : t("form.createAccount")}
        </button>
      </div>
    </form>
  );
}
