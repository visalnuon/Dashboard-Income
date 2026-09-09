import { useEffect, useState, type FormEvent } from "react";
import type { Account } from "../../types/database";
import { toISODate } from "../../utils/dates";
import { validateTransfer, type FieldErrors } from "../../utils/validation";
import { useLanguage } from "../../hooks/useLanguage";
import { localizeName } from "../../i18n/localize";
import { SelectField, TextAreaField, TextField } from "../Field";

type TransferFormProps = {
  accounts: Account[];
  submitting?: boolean;
  onCancel?: () => void;
  onSubmit: (values: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    transfer_date: string;
    note: string | null;
  }) => Promise<void>;
};

export function TransferForm({ accounts, submitting, onCancel, onSubmit }: TransferFormProps) {
  const { t, te } = useLanguage();
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!fromId && accounts[0]) setFromId(accounts[0].id);
    if (!toId && accounts[1]) setToId(accounts[1].id);
  }, [accounts, fromId, toId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = te(validateTransfer({ fromId, toId, amount, date }));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({
      from_account_id: fromId,
      to_account_id: toId,
      amount: Number(amount),
      transfer_date: date,
      note: note.trim() || null,
    });
  }

  return (
    <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
      <SelectField label={t("transfer.from")} value={fromId} error={errors.fromId} onChange={(event) => setFromId(event.target.value)}>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{localizeName(account.name, t)}</option>
        ))}
      </SelectField>
      <SelectField label={t("transfer.to")} value={toId} error={errors.toId} onChange={(event) => setToId(event.target.value)}>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{localizeName(account.name, t)}</option>
        ))}
      </SelectField>
      <TextField label={t("form.amount")} type="number" min="0.01" step="0.01" value={amount} error={errors.amount} onChange={(event) => setAmount(event.target.value)} />
      <TextField label={t("form.date")} type="date" value={date} error={errors.date} onChange={(event) => setDate(event.target.value)} />
      <TextAreaField label={t("form.description")} wide rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="modal-actions">
        {onCancel ? <button type="button" className="ghost-btn bordered" onClick={onCancel}>{t("common.cancel")}</button> : null}
        <button type="submit" className="primary-btn" disabled={submitting}>{submitting ? t("common.saving") : t("transfer.submit")}</button>
      </div>
    </form>
  );
}
