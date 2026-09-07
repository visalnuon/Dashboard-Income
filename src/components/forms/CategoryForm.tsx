import { useState, type FormEvent } from "react";
import type { Category, TransactionType } from "../../types/database";
import { validateCategory, type FieldErrors } from "../../utils/validation";
import { useLanguage } from "../../hooks/useLanguage";
import { SelectField, TextField } from "../Field";

export const CATEGORY_ICONS = ["🛒", "▣", "ϟ", "▶", "▤", "◎", "↗", "⌁", "◈", "✦", "◉", "♨", "🚗", "✈", "🏠", "🎓"];

type CategoryFormProps = {
  initial?: Category | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string; type: TransactionType; icon: string }) => Promise<void>;
};

export function CategoryForm({ initial, submitting, onCancel, onSubmit }: CategoryFormProps) {
  const { t, te } = useLanguage();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [icon, setIcon] = useState(initial?.icon ?? "◈");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = te(validateCategory({ name, type, icon }));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({ name: name.trim(), type, icon });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <TextField label={t("form.name")} value={name} error={errors.name} placeholder={t("form.categoryPlaceholder")} onChange={(event) => setName(event.target.value)} />
        <SelectField label={t("form.type")} value={type} error={errors.type} onChange={(event) => setType(event.target.value as TransactionType)}>
          <option value="expense">{t("common.expense")}</option>
          <option value="income">{t("common.income")}</option>
        </SelectField>
        <div className="wide icon-picker">
          <span>{t("form.icon")}</span>
          <div className="icon-grid">
            {CATEGORY_ICONS.map((item) => (
              <button
                type="button"
                key={item}
                className={icon === item ? "icon-choice active" : "icon-choice"}
                onClick={() => setIcon(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {errors.icon ? <small className="field-error">{errors.icon}</small> : null}
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="ghost-btn bordered" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? t("common.saving") : initial ? t("form.saveCategory") : t("form.createCategory")}
        </button>
      </div>
    </form>
  );
}
