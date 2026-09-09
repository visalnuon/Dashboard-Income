import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { LineChart } from "../components/charts/LineChart";
import { EmptyState } from "../components/Status";
import { SelectField, TextField } from "../components/Field";
import { useAccounts } from "../hooks/useAccounts";
import { useAllTransactions } from "../hooks/useTransactions";
import { useBudgets } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { useGoals } from "../hooks/useGoals";
import { useLanguage } from "../hooks/useLanguage";
import { useRecurring } from "../hooks/useLedger";
import { useToast } from "../hooks/useToast";
import { localizeName } from "../i18n/localize";
import type { TranslationKey } from "../i18n/translations";
import { createRecurring, deleteRecurring } from "../services/ledger";
import type { RecurringFrequency, TransactionType } from "../types/database";
import { buildAchievements } from "../utils/achievements";
import {
  currentMonthYear,
  daysInMonth,
  monthBounds,
  monthLabel,
  monthName,
  monthShortLabel,
  shiftMonth,
  toISODate,
} from "../utils/dates";
import { downloadText, moneyLine, printReport, transactionsCsv } from "../utils/export";
import { formatMoney, formatPercent, savingsRate, toNumber } from "../utils/format";
import { validateRecurring } from "../utils/validation";

export function MorePage() {
  const { t, locale, te } = useLanguage();
  const { notify } = useToast();
  const now = currentMonthYear();
  const [selected, setSelected] = useState(now);
  const [day, setDay] = useState<string | null>(null);
  const [exportRange, setExportRange] = useState<"month" | "selected" | "all">("month");
  const { data: allTx, reload } = useAllTransactions({});
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: budgets } = useBudgets(selected.month, selected.year);
  const { data: goals } = useGoals();
  const { data: recurring, reload: reloadRecurring } = useRecurring();

  const bounds = monthBounds(selected.month, selected.year);
  const monthTx = allTx.filter((row) => row.transaction_date >= bounds.from && row.transaction_date <= bounds.to);
  const income = monthTx.filter((row) => row.type === "income").reduce((sum, row) => sum + toNumber(row.amount), 0);
  const expenses = monthTx.filter((row) => row.type === "expense").reduce((sum, row) => sum + toNumber(row.amount), 0);
  const net = income - expenses;
  const rate = savingsRate(income, expenses);
  const budgetTotal = budgets.reduce((sum, row) => sum + row.amount, 0);
  const budgetPct = budgetTotal > 0 ? (expenses / budgetTotal) * 100 : 0;
  const dim = daysInMonth(selected.month, selected.year);
  const firstWeekday = new Date(selected.year, selected.month - 1, 1).getDay();
  const dayTx = day ? monthTx.filter((row) => row.transaction_date === day) : [];

  const yearPoints = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const range = monthBounds(month, selected.year);
      const rows = allTx.filter((row) => row.transaction_date >= range.from && row.transaction_date <= range.to);
      return {
        month: monthShortLabel(`${selected.year}-${String(month).padStart(2, "0")}`, locale),
        income: rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0),
        expense: rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0),
      };
    });
  }, [allTx, locale, selected.year]);

  const yearIncome = yearPoints.reduce((sum, item) => sum + item.income, 0);
  const yearExpense = yearPoints.reduce((sum, item) => sum + item.expense, 0);
  const yearSaved = yearIncome - yearExpense;
  const previous = shiftMonth(selected.month, selected.year, -1);
  const prevBounds = monthBounds(previous.month, previous.year);
  const prevTx = allTx.filter((row) => row.transaction_date >= prevBounds.from && row.transaction_date <= prevBounds.to);
  const prevNet = prevTx.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0)
    - prevTx.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const topMap = new Map<string, number>();
  for (const row of monthTx.filter((item) => item.type === "expense")) {
    const name = localizeName(row.category?.name, t) || t("common.other");
    topMap.set(name, (topMap.get(name) ?? 0) + row.amount);
  }
  const top = [...topMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const savingsVs = prevNet === 0 ? null : ((net - prevNet) / Math.abs(prevNet)) * 100;
  const achievements = buildAchievements({
    goals,
    budgetTotal,
    budgetPct,
    income,
    expenses,
    monthNet: net,
    monthlyNets: yearPoints.map((item) => item.income - item.expense),
    txDates: monthTx.map((row) => row.transaction_date),
  });

  const [type, setType] = useState<TransactionType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [nextDate, setNextDate] = useState(toISODate(new Date()));
  const filteredCats = categories.filter((item) => item.type === type);

  function exportRows() {
    if (exportRange === "all") return allTx;
    if (exportRange === "selected") return monthTx;
    const current = monthBounds(now.month, now.year);
    return allTx.filter((row) => row.transaction_date >= current.from && row.transaction_date <= current.to);
  }

  function handleCsv(kind: "csv" | "xlsx") {
    const name = kind === "xlsx" ? "visal-finance.xls" : "visal-finance.csv";
    downloadText(name, transactionsCsv(exportRows()), kind === "xlsx" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8");
    notify(t("export.done"));
  }

  function handlePdf() {
    const ok = printReport(t("report.title", { month: monthLabel(selected.month, selected.year, locale) }), [
      moneyLine(t("snap.income"), income),
      moneyLine(t("snap.expenses"), expenses),
      moneyLine(t("snap.saved"), net),
      `${t("dashboard.savings")}: ${income > 0 ? formatPercent(rate) : "—"}`,
      `${t("report.top")}: ${top?.[0] ?? t("snap.none")}`,
      `${t("report.budget")}: ${budgetTotal > 0 ? `${Math.round(budgetPct)}%` : "—"}`,
      savingsVs == null ? t("snap.noPrev") : t("report.vs", { pct: savingsVs.toFixed(0), month: monthName(previous.month, locale) }),
    ]);
    if (!ok) notify(t("export.printFail"), "error");
  }

  async function saveRecurring(event: FormEvent) {
    event.preventDefault();
    const errors = te(validateRecurring({ type, title, amount, categoryId, accountId, frequency, date: nextDate }));
    if (Object.keys(errors).length > 0) {
      notify(Object.values(errors)[0] ?? t("toast.generic"), "error");
      return;
    }
    await createRecurring({
      type,
      title: title.trim(),
      amount: Number(amount),
      category_id: categoryId,
      account_id: accountId,
      frequency,
      next_date: nextDate,
      note: null,
    });
    notify(t("toast.recurringAdded"));
    setTitle("");
    setAmount("");
    reloadRecurring();
    reload();
  }

  return (
    <div className="more-stack">
      <section className="more-links">
        <Link to="/budgets"><Icon name="budgets" />{t("nav.budgets")}</Link>
        <Link to="/categories"><Icon name="categories" />{t("nav.categories")}</Link>
        <Link to="/settings"><Icon name="settings" />{t("nav.settings")}</Link>
        <Link to="/help"><Icon name="help" />{t("nav.help")}</Link>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("cal.title")}</h2>
            <p>{monthLabel(selected.month, selected.year, locale)}</p>
          </div>
          <div className="row-actions">
            <button type="button" className="ghost-btn bordered" onClick={() => setSelected(shiftMonth(selected.month, selected.year, -1))} aria-label={t("dash.prevMonth")}><Icon name="chevronLeft" /></button>
            <button type="button" className="ghost-btn bordered" onClick={() => setSelected(shiftMonth(selected.month, selected.year, 1))} aria-label={t("dash.nextMonth")}><Icon name="chevronRight" /></button>
          </div>
        </div>
        <div className="cal-grid">
          {Array.from({ length: firstWeekday }, (_, index) => <span key={`pad-${index}`} />)}
          {Array.from({ length: dim }, (_, index) => {
            const iso = `${selected.year}-${String(selected.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
            const rows = monthTx.filter((row) => row.transaction_date === iso);
            const dayIncome = rows.some((row) => row.type === "income");
            const dayExpense = rows.some((row) => row.type === "expense");
            return (
              <button key={iso} type="button" className={day === iso ? "cal-day active" : "cal-day"} onClick={() => setDay(iso)}>
                <b>{index + 1}</b>
                {dayIncome ? <i className="up" /> : null}
                {dayExpense ? <i className="down" /> : null}
              </button>
            );
          })}
        </div>
        {day ? (
          <div className="cal-day-list">
            <strong>{day}</strong>
            {dayTx.length === 0 ? <p className="muted">{t("cal.empty")}</p> : dayTx.map((row) => (
              <p key={row.id}>{localizeName(row.title, t)} · {row.type === "income" ? "+" : "-"}{formatMoney(row.amount)}</p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>{t("year.title")}</h2><p>{selected.year}</p></div></div>
        <div className="snapshot-metrics four">
          <div><span>{t("snap.income")}</span><strong className="up">{formatMoney(yearIncome)}</strong></div>
          <div><span>{t("snap.expenses")}</span><strong className="down">{formatMoney(yearExpense)}</strong></div>
          <div><span>{t("snap.saved")}</span><strong>{formatMoney(yearSaved, { signed: true })}</strong></div>
          <div><span>{t("year.avg")}</span><strong>{formatMoney(yearSaved / 12, { signed: true })}</strong></div>
        </div>
        <LineChart data={yearPoints} />
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>{t("report.title", { month: monthLabel(selected.month, selected.year, locale) })}</h2><p>{t("export.body")}</p></div></div>
        <div className="filter-bar">
          <SelectField label={t("export.range")} value={exportRange} onChange={(event) => setExportRange(event.target.value as "month" | "selected" | "all")}>
            <option value="month">{t("export.current")}</option>
            <option value="selected">{t("export.selected")}</option>
            <option value="all">{t("export.all")}</option>
          </SelectField>
        </div>
        <div className="export-actions">
          <button type="button" className="ghost-btn bordered" onClick={() => handleCsv("csv")}><Icon name="file" />CSV</button>
          <button type="button" className="ghost-btn bordered" onClick={() => handleCsv("xlsx")}><Icon name="file" />Excel</button>
          <button type="button" className="primary-btn" onClick={handlePdf}><Icon name="file" />PDF</button>
        </div>
        <div className="report-preview">
          <p>{moneyLine(t("snap.income"), income)}</p>
          <p>{moneyLine(t("snap.expenses"), expenses)}</p>
          <p>{moneyLine(t("snap.saved"), net)}</p>
          <p>{t("dashboard.savings")}: {income > 0 ? formatPercent(rate) : "—"}</p>
          <p>{t("report.top")}: {top?.[0] ?? t("snap.none")}</p>
          <p>{t("report.budget")}: {budgetTotal > 0 ? `${Math.round(budgetPct)}%` : "—"}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>{t("badge.title")}</h2><p>{t("badge.body")}</p></div></div>
        {achievements.length === 0 ? (
          <EmptyState title={t("badge.emptyTitle")} message={t("badge.emptyBody")} icon="spark" />
        ) : (
          <ul className="badge-list">
            {achievements.map((item) => (
              <li key={item.titleKey}>
                <span className="insight-icon"><Icon name={item.icon} /></span>
                <div><strong>{t(item.titleKey)}</strong><p>{t(item.bodyKey)}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>{t("recur.title")}</h2><p>{t("recur.body")}</p></div></div>
        <form className="form-grid" onSubmit={(event) => void saveRecurring(event)}>
          <SelectField label={t("form.type")} value={type} onChange={(event) => setType(event.target.value as TransactionType)}>
            <option value="expense">{t("common.expense")}</option>
            <option value="income">{t("common.income")}</option>
          </SelectField>
          <TextField label={t("form.title")} value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextField label={t("form.amount")} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <SelectField label={t("form.category")} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{t("form.selectCategory")}</option>
            {filteredCats.map((item) => <option key={item.id} value={item.id}>{localizeName(item.name, t)}</option>)}
          </SelectField>
          <SelectField label={t("form.account")} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">{t("form.selectAccount")}</option>
            {accounts.map((item) => <option key={item.id} value={item.id}>{localizeName(item.name, t)}</option>)}
          </SelectField>
          <SelectField label={t("recur.frequency")} value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}>
            <option value="daily">{t("recur.daily")}</option>
            <option value="weekly">{t("recur.weekly")}</option>
            <option value="monthly">{t("recur.monthly")}</option>
          </SelectField>
          <TextField label={t("recur.next")} type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
          <div className="modal-actions"><button type="submit" className="primary-btn">{t("recur.add")}</button></div>
        </form>
        {recurring.length === 0 ? <p className="muted">{t("recur.empty")}</p> : (
          <ul className="goal-list">
            {recurring.map((item) => (
              <li className="goal-card" key={item.id}>
                <div className="goal-head">
                  <strong>{item.title} · {formatMoney(item.amount)}</strong>
                  <button type="button" className="ghost-btn danger" onClick={() => { void deleteRecurring(item.id).then(() => { notify(t("toast.recurringDeleted")); reloadRecurring(); }); }}>{t("common.delete")}</button>
                </div>
                <small className="muted">{t(`recur.${item.frequency}` as TranslationKey)} · {item.next_date}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
