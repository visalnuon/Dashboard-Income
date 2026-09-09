import { useEffect, useState, type FormEvent } from "react";
import type { SavingsGoal } from "../../types/database";
import { validateGoal, type FieldErrors } from "../../utils/validation";
import { useLanguage } from "../../hooks/useLanguage";
import { TextField } from "../Field";

type GoalFormProps = {
  initial?: SavingsGoal | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
  }) => Promise<void>;
};

export function GoalForm({ initial, submitting, onCancel, onSubmit }: GoalFormProps) {
  const { t, te } = useLanguage();
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? String(initial.target_amount) : "");
  const [current, setCurrent] = useState(initial ? String(initial.current_amount) : "0");
  const [date, setDate] = useState(initial?.target_date ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setName(initial?.name ?? "");
    setTarget(initial ? String(initial.target_amount) : "");
    setCurrent(initial ? String(initial.current_amount) : "0");
    setDate(initial?.target_date ?? "");
  }, [initial]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = te(validateGoal({ name, target, current }));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({
      name: name.trim(),
      target_amount: Number(target),
      current_amount: current === "" ? 0 : Number(current),
      target_date: date || null,
    });
  }

  return (
    <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
      <TextField
        label={t("goal.name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        wide
      />
      <TextField
        label={t("goal.target")}
        type="number"
        min="0"
        step="0.01"
        value={target}
        onChange={(event) => setTarget(event.target.value)}
        error={errors.target}
      />
      <TextField
        label={t("goal.current")}
        type="number"
        min="0"
        step="0.01"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        error={errors.current}
      />
      <TextField
        label={`${t("goal.date")} (${t("goal.dateOptional")})`}
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        wide
      />
      <div className="modal-actions">
        <button type="button" className="ghost-btn bordered" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
