import { Icon } from "./Icon";
import { useLanguage } from "../hooks/useLanguage";

type QuickActionsProps = {
  onIncome: () => void;
  onExpense: () => void;
  onTransfer: () => void;
  onGoal: () => void;
};

export function QuickActions({ onIncome, onExpense, onTransfer, onGoal }: QuickActionsProps) {
  const { t } = useLanguage();
  return (
    <section className="quick-strip" aria-label={t("quick.title")}>
      <button type="button" onClick={onIncome}>
        <span className="quick-ico"><Icon name="income" /></span>
        {t("quick.income")}
      </button>
      <button type="button" onClick={onExpense}>
        <span className="quick-ico"><Icon name="expense" /></span>
        {t("quick.expense")}
      </button>
      <button type="button" onClick={onTransfer}>
        <span className="quick-ico"><Icon name="transfer" /></span>
        {t("quick.transfer")}
      </button>
      <button type="button" onClick={onGoal}>
        <span className="quick-ico"><Icon name="target" /></span>
        {t("quick.goal")}
      </button>
    </section>
  );
}
