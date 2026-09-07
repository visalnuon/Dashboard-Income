import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Account, Category, TransactionType, TransactionWithRelations } from "../../types/database";
import { toISODate } from "../../utils/dates";
import { validateTransaction, type FieldErrors } from "../../utils/validation";
import { useLanguage } from "../../hooks/useLanguage";
import { localizeName } from "../../i18n/localize";
import { SelectField, TextAreaField, TextField } from "../Field";

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  initial?: TransactionWithRelations | null;
  defaultType?: TransactionType;
  lockType?: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    type: TransactionType;
    title: string;
    amount: number;
    category_id: string;
    account_id: string;
    transaction_date: string;
    description: string | null;
  }) => Promise<void>;
};

export function TransactionForm({
  accounts,
  categories,
  initial,
  defaultType = "expense",
  lockType = false,
  submitting,
  onCancel,
  onSubmit,
}: TransactionFormProps) {
  const { t, te } = useLanguage();
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [accountId, setAccountId] = useState(initial?.account_id ?? "");
  const [date, setDate] = useState(initial?.transaction_date ?? toISODate(new Date()));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  useEffect(() => {
    if (initial) return;
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId, initial]);

  useEffect(() => {
    if (initial && initial.type === type && initial.category_id) return;
    if (!filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? "");
    }
  }, [filteredCategories, categoryId, initial, type]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = te(validateTransaction({
      type,
      title,
      amount,
      categoryId,
      accountId,
      date,
    }));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      type,
      title: title.trim(),
      amount: Number(amount),
      category_id: categoryId,
      account_id: accountId,
      transaction_date: date,
      description: description.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <SelectField
          label={t("form.type")}
          value={type}
          disabled={lockType}
          error={errors.type}
          onChange={(event) => {
            const next = event.target.value as TransactionType;
            setType(next);
            setCategoryId("");
          }}
        >
          <option value="expense">{t("common.expense")}</option>
          <option value="income">{t("common.income")}</option>
        </SelectField>
        <TextField
          label={t("form.amount")}
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          error={errors.amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <TextField
          label={t("form.title")}
          placeholder={t("form.titlePlaceholder")}
          value={title}
          error={errors.title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <SelectField
          label={t("form.category")}
          value={categoryId}
          error={errors.categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">{t("form.selectCategory")}</option>
          {filteredCategories.map((category) => (
            <option key={category.id} value={category.id}>{category.icon} {localizeName(category.name, t)}</option>
          ))}
        </SelectField>
        <SelectField
          label={t("form.account")}
          value={accountId}
          error={errors.accountId}
          onChange={(event) => setAccountId(event.target.value)}
        >
          <option value="">{t("form.selectAccount")}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{localizeName(account.name, t)}</option>
          ))}
        </SelectField>
        <TextField
          label={t("form.date")}
          type="date"
          value={date}
          error={errors.date}
          onChange={(event) => setDate(event.target.value)}
        />
        <TextAreaField
          label={t("form.description")}
          wide
          rows={3}
          placeholder={t("form.notePlaceholder")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="ghost-btn bordered" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? t("common.saving") : initial ? t("form.saveChanges") : t("form.saveTransaction")}
        </button>
      </div>
    </form>
  );
}
