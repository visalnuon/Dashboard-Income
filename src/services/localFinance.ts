import type {
  Account,
  AccountInsert,
  Budget,
  BudgetInsert,
  BudgetWithCategory,
  Category,
  CategoryInsert,
  AccountTransfer,
  AccountTransferInsert,
  RecurringFrequency,
  RecurringRule,
  RecurringRuleInsert,
  SavingsGoal,
  SavingsGoalInsert,
  SavingsGoalUpdate,
  Transaction,
  TransactionFilters,
  TransactionInsert,
  TransactionType,
  TransactionUpdate,
  TransactionWithRelations,
} from "../types/database";
import { hasAppCloudSession } from "../lib/dataMode";
import { addDaysIso, addMonthsIso, toISODate } from "../utils/dates";
import { toNumber } from "../utils/format";
import { cloudLoadFinance, cloudSaveFinance } from "./cloudFinance";
import { DEMO_USER_ID, getLocalAuthUserId, readLocalSession } from "./localAuth";

const STORAGE_KEY = "visal-finance-v1";

function currentUserId() {
  return getLocalAuthUserId();
}

function storageKey() {
  const id = currentUserId();
  if (id === DEMO_USER_ID || id === "local-user") return STORAGE_KEY;
  return `${STORAGE_KEY}:${id}`;
}

type Store = {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  transfers: AccountTransfer[];
  recurring: RecurringRule[];
};

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function seed(): Store {
  const created_at = nowIso();
  const user_id = currentUserId();
  const categories: Category[] = [
    { id: createId(), user_id, name: "Salary", type: "income", icon: "↗", created_at },
    { id: createId(), user_id, name: "Freelance", type: "income", icon: "✦", created_at },
    { id: createId(), user_id, name: "Other income", type: "income", icon: "◉", created_at },
    { id: createId(), user_id, name: "Food", type: "expense", icon: "🛒", created_at },
    { id: createId(), user_id, name: "Transport", type: "expense", icon: "🚗", created_at },
    { id: createId(), user_id, name: "Bills", type: "expense", icon: "⌂", created_at },
    { id: createId(), user_id, name: "Shopping", type: "expense", icon: "▤", created_at },
    { id: createId(), user_id, name: "Health", type: "expense", icon: "✚", created_at },
    { id: createId(), user_id, name: "Other expense", type: "expense", icon: "◈", created_at },
  ];
  const accounts: Account[] = [
    { id: createId(), user_id, name: "Cash", type: "cash", balance: 0, created_at, updated_at: created_at },
    { id: createId(), user_id, name: "Bank", type: "bank", balance: 0, created_at, updated_at: created_at },
  ];
  return { categories, accounts, transactions: [], budgets: [], goals: [], transfers: [], recurring: [] };
}

function cloneStore(store: Store): Store {
  return JSON.parse(JSON.stringify(store)) as Store;
}

function asStore(value: unknown): Store | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Store;
  return {
    categories: parsed.categories ?? [],
    accounts: parsed.accounts ?? [],
    transactions: parsed.transactions ?? [],
    budgets: parsed.budgets ?? [],
    goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal) : [],
    transfers: Array.isArray(parsed.transfers) ? parsed.transfers.map(normalizeTransfer) : [],
    recurring: Array.isArray(parsed.recurring) ? parsed.recurring.map(normalizeRecurring) : [],
  };
}

function normalizeGoal(row: SavingsGoal): SavingsGoal {
  return {
    ...row,
    target_amount: toNumber(row.target_amount),
    current_amount: toNumber(row.current_amount),
    target_date: row.target_date || null,
  };
}

function normalizeTransfer(row: AccountTransfer): AccountTransfer {
  return {
    ...row,
    amount: toNumber(row.amount),
    note: row.note || null,
  };
}

function normalizeRecurring(row: RecurringRule): RecurringRule {
  return {
    ...row,
    amount: toNumber(row.amount),
    note: row.note || null,
  };
}

function nextRecurringDate(date: string, frequency: RecurringFrequency) {
  if (frequency === "daily") return addDaysIso(date, 1);
  if (frequency === "weekly") return addDaysIso(date, 7);
  return addMonthsIso(date, 1);
}

function applyDueRecurring(store: Store) {
  const today = toISODate(new Date());
  let changed = false;
  for (const rule of store.recurring) {
    let guard = 0;
    while (rule.next_date <= today && guard < 36) {
      const created_at = nowIso();
      store.transactions.push({
        id: createId(),
        user_id: currentUserId(),
        account_id: rule.account_id,
        category_id: rule.category_id,
        type: rule.type,
        title: rule.title,
        amount: toNumber(rule.amount),
        description: rule.note,
        transaction_date: rule.next_date,
        created_at,
        updated_at: created_at,
      });
      rule.next_date = nextRecurringDate(rule.next_date, rule.frequency);
      changed = true;
      guard += 1;
    }
  }
  if (changed) recomputeBalances(store);
  return changed;
}

function isPopulated(store: Store | null): store is Store {
  return Boolean(store?.categories?.length && store?.accounts?.length);
}

function readLocalCache(): Store | null {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    const parsed = asStore(JSON.parse(raw) as Store);
    return isPopulated(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalCache(store: Store) {
  localStorage.setItem(storageKey(), JSON.stringify(store));
}

let memory: { owner: string; store: Store } | null = null;
let writeChain = Promise.resolve();

export function resetFinanceCache() {
  memory = null;
}

function enqueue<T>(job: () => Promise<T>) {
  const run = writeChain.then(job, job);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function loadStore(): Promise<Store> {
  const session = readLocalSession();
  const owner = session?.userId ?? "local-user";
  if (memory?.owner !== owner) {
    if (hasAppCloudSession() && session?.token) {
      try {
        const remote = asStore(await cloudLoadFinance(session.token));
        const next = isPopulated(remote) ? remote : (readLocalCache() ?? seed());
        memory = { owner, store: cloneStore(next) };
        writeLocalCache(next);
        if (!isPopulated(remote)) await cloudSaveFinance(session.token, next);
      } catch {
        const fallback = readLocalCache() ?? seed();
        memory = { owner, store: cloneStore(fallback) };
      }
    } else {
      const local = readLocalCache() ?? seed();
      memory = { owner, store: cloneStore(local) };
      writeLocalCache(local);
    }
  }

  if (memory && applyDueRecurring(memory.store)) {
    await persistStore(memory.store);
  }
  return cloneStore(memory!.store);
}

async function persistStore(store: Store) {
  const session = readLocalSession();
  const owner = session?.userId ?? "local-user";
  memory = { owner, store: cloneStore(store) };
  writeLocalCache(store);
  if (hasAppCloudSession() && session?.token) {
    try {
      await cloudSaveFinance(session.token, JSON.parse(JSON.stringify(store)) as object);
    } catch {
      // Keep the local save so Vercel / this browser still work if SQL or keys fail.
    }
  }
}

function read<T>(fn: (store: Store) => T) {
  return enqueue(async () => fn(await loadStore()));
}

function mutate<T>(fn: (store: Store) => T) {
  return enqueue(async () => {
    const store = await loadStore();
    const result = fn(store);
    await persistStore(store);
    return result;
  });
}

function withCategory(budget: Budget, store: Store): BudgetWithCategory {
  const category = store.categories.find((item) => item.id === budget.category_id) ?? null;
  return {
    ...budget,
    amount: toNumber(budget.amount),
    category: category
      ? { id: category.id, name: category.name, icon: category.icon, type: category.type }
      : null,
  };
}

function withRelations(row: Transaction, store: Store): TransactionWithRelations {
  const category = store.categories.find((item) => item.id === row.category_id) ?? null;
  const account = store.accounts.find((item) => item.id === row.account_id) ?? null;
  return {
    ...row,
    amount: toNumber(row.amount),
    category: category
      ? { id: category.id, name: category.name, icon: category.icon, type: category.type }
      : null,
    account: account ? { id: account.id, name: account.name, type: account.type } : null,
  };
}

function recomputeBalances(store: Store) {
  for (const account of store.accounts) {
    const fromTx = store.transactions
      .filter((row) => row.account_id === account.id)
      .reduce((sum, row) => sum + (row.type === "income" ? toNumber(row.amount) : -toNumber(row.amount)), 0);
    const fromTransfers = store.transfers.reduce((sum, row) => {
      if (row.to_account_id === account.id) return sum + toNumber(row.amount);
      if (row.from_account_id === account.id) return sum - toNumber(row.amount);
      return sum;
    }, 0);
    account.balance = fromTx + fromTransfers;
    account.updated_at = nowIso();
  }
}

function matchesSearch(row: TransactionWithRelations, search?: string) {
  if (!search?.trim()) return true;
  const term = search.toLowerCase().trim().replace(/[$,]/g, "");
  const amount = toNumber(row.amount);
  const haystack = [
    row.title,
    row.description ?? "",
    row.category?.name ?? "",
    row.account?.name ?? "",
    row.transaction_date,
    row.created_at.slice(0, 10),
    String(amount),
    amount.toFixed(2),
    amount.toFixed(0),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/,/g, "");
  return haystack.includes(term);
}

function filterTransactions(store: Store, filters: Omit<TransactionFilters, "page" | "pageSize">) {
  return store.transactions
    .map((row) => withRelations(row, store))
    .filter((row) => {
      if (filters.type && row.type !== filters.type) return false;
      if (filters.categoryId && row.category_id !== filters.categoryId) return false;
      if (filters.accountId && row.account_id !== filters.accountId) return false;
      if (filters.from && row.transaction_date < filters.from) return false;
      if (filters.to && row.transaction_date > filters.to) return false;
      return matchesSearch(row, filters.search);
    })
    .sort((a, b) => {
      if (a.transaction_date !== b.transaction_date) return a.transaction_date < b.transaction_date ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    });
}

export function localListCategories(type?: TransactionType) {
  return read((store) => {
    const rows = type ? store.categories.filter((item) => item.type === type) : store.categories;
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  });
}

export function localCreateCategory(values: CategoryInsert) {
  return mutate((store) => {
    const row: Category = {
      id: createId(),
      user_id: currentUserId(),
      name: values.name.trim(),
      type: values.type,
      icon: values.icon,
      created_at: nowIso(),
    };
    store.categories.push(row);
    return row;
  });
}

export function localUpdateCategory(id: string, values: Partial<CategoryInsert>) {
  return mutate((store) => {
    const row = store.categories.find((item) => item.id === id);
    if (!row) throw new Error("Category not found.");
    if (values.name) row.name = values.name.trim();
    if (values.type) row.type = values.type;
    if (values.icon) row.icon = values.icon;
    return row;
  });
}

export function localDeleteCategory(id: string) {
  return mutate((store) => {
    if (
      store.transactions.some((row) => row.category_id === id) ||
      store.budgets.some((row) => row.category_id === id) ||
      store.recurring.some((row) => row.category_id === id)
    ) {
      throw new Error("This record is still in use and cannot be deleted.");
    }
    store.categories = store.categories.filter((item) => item.id !== id);
  });
}

export function localListAccounts() {
  return read((store) => {
    recomputeBalances(store);
    return [...store.accounts]
      .map((row) => ({ ...row, balance: toNumber(row.balance) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export function localCreateAccount(values: AccountInsert) {
  return mutate((store) => {
    const created_at = nowIso();
    const row: Account = {
      id: createId(),
      user_id: currentUserId(),
      name: values.name.trim(),
      type: values.type,
      balance: 0,
      created_at,
      updated_at: created_at,
    };
    store.accounts.push(row);
    const opening = toNumber(values.balance);
    if (opening !== 0) {
      const type: TransactionType = opening > 0 ? "income" : "expense";
      let category = store.categories.find((item) => item.type === type);
      if (!category) {
        category = {
          id: createId(),
          user_id: currentUserId(),
          name: type === "income" ? "Other income" : "Other expense",
          type,
          icon: type === "income" ? "◉" : "◈",
          created_at,
        };
        store.categories.push(category);
      }
      store.transactions.push({
        id: createId(),
        user_id: currentUserId(),
        account_id: row.id,
        category_id: category.id,
        type,
        title: "Opening balance",
        amount: Math.abs(opening),
        description: null,
        transaction_date: created_at.slice(0, 10),
        created_at,
        updated_at: created_at,
      });
    }
    recomputeBalances(store);
    return { ...row, balance: toNumber(store.accounts.find((item) => item.id === row.id)?.balance) };
  });
}

export function localUpdateAccount(id: string, values: { name: string; type: AccountInsert["type"] }) {
  return mutate((store) => {
    const row = store.accounts.find((item) => item.id === id);
    if (!row) throw new Error("Account not found.");
    row.name = values.name.trim();
    row.type = values.type;
    row.updated_at = nowIso();
    return { ...row, balance: toNumber(row.balance) };
  });
}

export function localDeleteAccount(id: string) {
  return mutate((store) => {
    if (store.transactions.some((row) => row.account_id === id)) {
      throw new Error("This record is still in use and cannot be deleted.");
    }
    if (store.transfers.some((row) => row.from_account_id === id || row.to_account_id === id)) {
      throw new Error("This record is still in use and cannot be deleted.");
    }
    if (store.recurring.some((row) => row.account_id === id)) {
      throw new Error("This record is still in use and cannot be deleted.");
    }
    store.accounts = store.accounts.filter((item) => item.id !== id);
  });
}

export function localListTransactions(filters: TransactionFilters = {}) {
  return read((store) => {
    const rows = filterTransactions(store, filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return {
      data: rows.slice(start, start + pageSize),
      count: rows.length,
      all: rows,
    };
  });
}

export function localListAllTransactions(filters: Omit<TransactionFilters, "page" | "pageSize"> = {}) {
  return read((store) => filterTransactions(store, filters));
}

export function localCreateTransaction(values: TransactionInsert) {
  return mutate((store) => {
    const created_at = nowIso();
    const row: Transaction = {
      id: createId(),
      user_id: currentUserId(),
      account_id: values.account_id,
      category_id: values.category_id,
      type: values.type,
      title: values.title.trim(),
      amount: toNumber(values.amount),
      description: values.description,
      transaction_date: values.transaction_date,
      created_at,
      updated_at: created_at,
    };
    store.transactions.push(row);
    recomputeBalances(store);
    return withRelations(row, store);
  });
}

export function localUpdateTransaction(id: string, values: TransactionUpdate) {
  return mutate((store) => {
    const row = store.transactions.find((item) => item.id === id);
    if (!row) throw new Error("Transaction not found.");
    if (values.account_id) row.account_id = values.account_id;
    if (values.category_id) row.category_id = values.category_id;
    if (values.type) row.type = values.type;
    if (values.title) row.title = values.title.trim();
    if (values.amount != null) row.amount = toNumber(values.amount);
    if (values.description !== undefined) row.description = values.description;
    if (values.transaction_date) row.transaction_date = values.transaction_date;
    row.updated_at = nowIso();
    recomputeBalances(store);
    return withRelations(row, store);
  });
}

export function localDeleteTransaction(id: string) {
  return mutate((store) => {
    store.transactions = store.transactions.filter((item) => item.id !== id);
    recomputeBalances(store);
  });
}

export function localListBudgets(month?: number, year?: number) {
  return read((store) =>
    store.budgets
      .filter((row) => (month ? row.month === month : true) && (year ? row.year === year : true))
      .map((row) => withCategory(row, store))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
  );
}

export function localCreateBudget(values: BudgetInsert) {
  return mutate((store) => {
    const exists = store.budgets.some(
      (row) => row.category_id === values.category_id && row.month === values.month && row.year === values.year,
    );
    if (exists) throw new Error("A record with these details already exists.");
    const created_at = nowIso();
    const row: Budget = {
      id: createId(),
      user_id: currentUserId(),
      category_id: values.category_id,
      amount: toNumber(values.amount),
      month: values.month,
      year: values.year,
      created_at,
      updated_at: created_at,
    };
    store.budgets.push(row);
    return withCategory(row, store);
  });
}

export function localUpdateBudget(id: string, values: Partial<BudgetInsert>) {
  return mutate((store) => {
    const row = store.budgets.find((item) => item.id === id);
    if (!row) throw new Error("Budget not found.");
    if (values.category_id) row.category_id = values.category_id;
    if (values.amount != null) row.amount = toNumber(values.amount);
    if (values.month) row.month = values.month;
    if (values.year) row.year = values.year;
    row.updated_at = nowIso();
    return withCategory(row, store);
  });
}

export function localDeleteBudget(id: string) {
  return mutate((store) => {
    store.budgets = store.budgets.filter((item) => item.id !== id);
  });
}

export function localListGoals() {
  return read((store) =>
    [...store.goals]
      .map(normalizeGoal)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
  );
}

export function localCreateGoal(values: SavingsGoalInsert) {
  return mutate((store) => {
    const created_at = nowIso();
    const row: SavingsGoal = {
      id: createId(),
      user_id: currentUserId(),
      name: values.name.trim(),
      target_amount: toNumber(values.target_amount),
      current_amount: toNumber(values.current_amount),
      target_date: values.target_date || null,
      created_at,
      updated_at: created_at,
    };
    store.goals.push(row);
    return normalizeGoal(row);
  });
}

export function localUpdateGoal(id: string, values: SavingsGoalUpdate) {
  return mutate((store) => {
    const row = store.goals.find((item) => item.id === id);
    if (!row) throw new Error("Goal not found.");
    if (values.name != null) row.name = values.name.trim();
    if (values.target_amount != null) row.target_amount = toNumber(values.target_amount);
    if (values.current_amount != null) row.current_amount = toNumber(values.current_amount);
    if (values.target_date !== undefined) row.target_date = values.target_date || null;
    row.updated_at = nowIso();
    return normalizeGoal(row);
  });
}

export function localDeleteGoal(id: string) {
  return mutate((store) => {
    store.goals = store.goals.filter((item) => item.id !== id);
  });
}

export function localListTransfers() {
  return read((store) =>
    [...store.transfers]
      .map(normalizeTransfer)
      .sort((a, b) => (a.transfer_date < b.transfer_date ? 1 : -1)),
  );
}

export function localCreateTransfer(values: AccountTransferInsert) {
  return mutate((store) => {
    if (values.from_account_id === values.to_account_id) {
      throw new Error("Choose two different accounts.");
    }
    const row: AccountTransfer = {
      id: createId(),
      user_id: currentUserId(),
      from_account_id: values.from_account_id,
      to_account_id: values.to_account_id,
      amount: toNumber(values.amount),
      transfer_date: values.transfer_date,
      note: values.note,
      created_at: nowIso(),
    };
    store.transfers.push(row);
    recomputeBalances(store);
    return normalizeTransfer(row);
  });
}

export function localDeleteTransfer(id: string) {
  return mutate((store) => {
    store.transfers = store.transfers.filter((item) => item.id !== id);
    recomputeBalances(store);
  });
}

export function localListRecurring() {
  return read((store) => [...store.recurring].map(normalizeRecurring).sort((a, b) => a.title.localeCompare(b.title)));
}

export function localCreateRecurring(values: RecurringRuleInsert) {
  return mutate((store) => {
    const row: RecurringRule = {
      id: createId(),
      user_id: currentUserId(),
      type: values.type,
      title: values.title.trim(),
      amount: toNumber(values.amount),
      category_id: values.category_id,
      account_id: values.account_id,
      frequency: values.frequency,
      next_date: values.next_date,
      note: values.note,
      created_at: nowIso(),
    };
    store.recurring.push(row);
    return normalizeRecurring(row);
  });
}

export function localDeleteRecurring(id: string) {
  return mutate((store) => {
    store.recurring = store.recurring.filter((item) => item.id !== id);
  });
}
