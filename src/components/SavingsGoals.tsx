import { useEffect, useState } from "react";
import { CountMoney } from "./CountMoney";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { ProgressBar } from "./ProgressBar";
import { EmptyState } from "./Status";
import { GoalForm } from "./forms/GoalForm";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { createGoal, deleteGoal, updateGoal } from "../services/goals";
import type { SavingsGoal } from "../types/database";
import { formatDate } from "../utils/format";

type SavingsGoalsProps = {
  goals: SavingsGoal[];
  hidden: boolean;
  onChange: () => void;
  openSignal?: number;
};

export function SavingsGoals({ goals, hidden, onChange, openSignal }: SavingsGoalsProps) {
  const { t, locale } = useLanguage();
  const { notify } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (openSignal) openCreate();
  }, [openSignal]);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditing(goal);
    setShowForm(true);
  }

  return (
    <section className="panel goals-panel">
      <div className="panel-head">
        <div>
          <h2>{t("goal.title")}</h2>
          <p>{t("goal.body")}</p>
        </div>
        <button type="button" className="ghost-btn bordered" onClick={openCreate}>
          <Icon name="plus" />
          {t("goal.add")}
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title={t("goal.emptyTitle")}
          message={t("goal.emptyBody")}
          icon="target"
          action={{ label: t("goal.add"), onClick: openCreate }}
        />
      ) : (
        <ul className="goal-list">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            return (
              <li className="goal-card" key={goal.id}>
                <div className="goal-head">
                  <strong>{goal.name}</strong>
                  <div className="row-actions">
                    <button type="button" className="ghost-btn" onClick={() => openEdit(goal)}>{t("common.edit")}</button>
                    <button type="button" className="ghost-btn danger" onClick={() => setDeleting(goal)}>{t("common.delete")}</button>
                  </div>
                </div>
                <p className="goal-amounts">
                  <CountMoney value={goal.current_amount} hidden={hidden} />
                  <span> / </span>
                  <CountMoney value={goal.target_amount} hidden={hidden} />
                </p>
                <div className="goal-progress">
                  <span>{t("goal.progress")}</span>
                  <strong>{Math.round(Math.min(pct, 999))}%</strong>
                </div>
                <ProgressBar value={pct} />
                {goal.target_date ? (
                  <small className="muted">{t("goal.due", { date: formatDate(goal.target_date, locale) })}</small>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {showForm ? (
        <Modal
          title={editing ? t("goal.editTitle") : t("goal.createTitle")}
          onClose={() => setShowForm(false)}
        >
          <GoalForm
            initial={editing}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              setSubmitting(true);
              try {
                if (editing) {
                  await updateGoal(editing.id, values);
                  notify(t("toast.goalUpdated"));
                } else {
                  await createGoal(values);
                  notify(t("toast.goalCreated"));
                }
                setShowForm(false);
                onChange();
              } catch (error) {
                notify(error instanceof Error ? error.message : t("toast.generic"), "error");
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t("goal.deleteTitle")}
          message={t("goal.deleteMsg", { name: deleting.name })}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteGoal(deleting.id);
              notify(t("toast.goalDeleted"));
              onChange();
            } catch (error) {
              notify(error instanceof Error ? error.message : t("toast.generic"), "error");
            } finally {
              setDeleting(null);
            }
          }}
        />
      ) : null}
    </section>
  );
}
