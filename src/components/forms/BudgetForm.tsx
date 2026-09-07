import { useState, type FormEvent } from "react";
import type { BudgetWithCategory, Category } from "../../types/database";
import { currentMonthYear, monthName } from "../../utils/dates";
import { validateBudget, type FieldErrors } from "../../utils/validation";
import { useLanguage } from "../../hooks/useLanguage";
import { localizeName } from "../../i18n/localize";
import { SelectField, TextField } from "../Field";

type BudgetFormProps = {
  categories: Category[];
  initial?: BudgetWithCategory | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: { category_id: string; amount: number; month: number; year: number }) => Promise<void>;
};

export function BudgetForm({ categories, initial, submitting, onCancel, onSubmit }: BudgetFormProps) {
  const { t, te, locale } = useLanguage();
  const now = currentMonthYear();
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [month, setMonth] = useState(String(initial?.month ?? now.month));
  const [year, setYear] = useState(String(initial?.year ?? now.year));
  const [errors, setErrors] = useState<FieldErrors>({});
  const expenseCategories = categories.filter((category) => category.type === "expense");
  const years = [now.year - 1, now.year, now.year + 1];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = te(validateBudget({ categoryId, amount, month, year }));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({
      category_id: categoryId,
      amount: Number(amount),
      month: Number(month),
      year: Number(year),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <SelectField label={t("form.category")} value={categoryId} error={errors.categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">{t("form.selectExpenseCategory")}</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>{category.icon} {localizeName(category.name, t)}</option>
          ))}
        </SelectField>
        <TextField
          label={t("form.monthlyBudget")}
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          error={errors.amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <SelectField label={t("form.month")} value={month} error={errors.month} onChange={(event) => setMonth(event.target.value)}>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {monthName(index + 1, locale)}
            </option>
          ))}
        </SelectField>
        <SelectField label={t("form.year")} value={year} error={errors.year} onChange={(event) => setYear(event.target.value)}>
          {years.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
      </div>
      <div className="modal-actions">
        <button type="button" className="ghost-btn bordered" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? t("common.saving") : initial ? t("form.saveBudget") : t("form.createBudget")}
        </button>
      </div>
    </form>
  );
}
