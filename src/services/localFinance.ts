import type {
  Account,
  AccountInsert,
  Budget,
  BudgetInsert,
  BudgetWithCategory,
  Category,
  CategoryInsert,
  Transaction,
  TransactionFilters,
  TransactionInsert,
  TransactionType,
  TransactionUpdate,
  TransactionWithRelations,
} from "../types/database";
import { toNumber } from "../utils/format";
import { DEMO_USER_ID, getLocalAuthUserId } from "./localAuth";

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
  return { categories, accounts, transactions: [], budgets: [] };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) {
      const next = seed();
      save(next);
      return next;
    }
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.categories?.length || !parsed.accounts?.length) {
      const next = seed();
      save(next);
      return next;
    }
    return {
      categories: parsed.categories ?? [],
      accounts: parsed.accounts ?? [],
      transactions: parsed.transactions ?? [],
      budgets: parsed.budgets ?? [],
    };
  } catch {
    const next = seed();
    save(next);
    return next;
  }
}

function save(store: Store) {
  localStorage.setItem(storageKey(), JSON.stringify(store));
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
    account.balance = store.transactions
      .filter((row) => row.account_id === account.id)
      .reduce((sum, row) => sum + (row.type === "income" ? toNumber(row.amount) : -toNumber(row.amount)), 0);
    account.updated_at = nowIso();
  }
}

function matchesSearch(row: TransactionWithRelations, search?: string) {
  if (!search?.trim()) return true;
  const term = search.toLowerCase().trim();
  return [row.title, row.description ?? "", row.category?.name ?? "", row.account?.name ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(term);
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
  const store = load();
  const rows = type ? store.categories.filter((item) => item.type === type) : store.categories;
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export function localCreateCategory(values: CategoryInsert) {
  const store = load();
  const row: Category = {
    id: createId(),
    user_id: currentUserId(),
    name: values.name.trim(),
    type: values.type,
    icon: values.icon,
    created_at: nowIso(),
  };
  store.categories.push(row);
  save(store);
  return row;
}

export function localUpdateCategory(id: string, values: Partial<CategoryInsert>) {
  const store = load();
  const row = store.categories.find((item) => item.id === id);
  if (!row) throw new Error("Category not found.");
  if (values.name) row.name = values.name.trim();
  if (values.type) row.type = values.type;
  if (values.icon) row.icon = values.icon;
  save(store);
  return row;
}

export function localDeleteCategory(id: string) {
  const store = load();
  if (store.transactions.some((row) => row.category_id === id) || store.budgets.some((row) => row.category_id === id)) {
    throw new Error("This record is still in use and cannot be deleted.");
  }
  store.categories = store.categories.filter((item) => item.id !== id);
  save(store);
}

export function localListAccounts() {
  const store = load();
  recomputeBalances(store);
  return [...store.accounts]
    .map((row) => ({ ...row, balance: toNumber(row.balance) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function localCreateAccount(values: AccountInsert) {
  const store = load();
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
  save(store);
  return { ...row, balance: toNumber(store.accounts.find((item) => item.id === row.id)?.balance) };
}

export function localUpdateAccount(id: string, values: { name: string; type: AccountInsert["type"] }) {
  const store = load();
  const row = store.accounts.find((item) => item.id === id);
  if (!row) throw new Error("Account not found.");
  row.name = values.name.trim();
  row.type = values.type;
  row.updated_at = nowIso();
  save(store);
  return { ...row, balance: toNumber(row.balance) };
}

export function localDeleteAccount(id: string) {
  const store = load();
  if (store.transactions.some((row) => row.account_id === id)) {
    throw new Error("This record is still in use and cannot be deleted.");
  }
  store.accounts = store.accounts.filter((item) => item.id !== id);
  save(store);
}

export function localListTransactions(filters: TransactionFilters = {}) {
  const store = load();
  const rows = filterTransactions(store, filters);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    count: rows.length,
    all: rows,
  };
}

export function localListAllTransactions(filters: Omit<TransactionFilters, "page" | "pageSize"> = {}) {
  return filterTransactions(load(), filters);
}

export function localCreateTransaction(values: TransactionInsert) {
  const store = load();
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
  save(store);
  return withRelations(row, store);
}

export function localUpdateTransaction(id: string, values: TransactionUpdate) {
  const store = load();
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
  save(store);
  return withRelations(row, store);
}

export function localDeleteTransaction(id: string) {
  const store = load();
  store.transactions = store.transactions.filter((item) => item.id !== id);
  recomputeBalances(store);
  save(store);
}

export function localListBudgets(month?: number, year?: number) {
  const store = load();
  return store.budgets
    .filter((row) => (month ? row.month === month : true) && (year ? row.year === year : true))
    .map((row) => withCategory(row, store))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function localCreateBudget(values: BudgetInsert) {
  const store = load();
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
  save(store);
  return withCategory(row, store);
}

export function localUpdateBudget(id: string, values: Partial<BudgetInsert>) {
  const store = load();
  const row = store.budgets.find((item) => item.id === id);
  if (!row) throw new Error("Budget not found.");
  if (values.category_id) row.category_id = values.category_id;
  if (values.amount != null) row.amount = toNumber(values.amount);
  if (values.month) row.month = values.month;
  if (values.year) row.year = values.year;
  row.updated_at = nowIso();
  save(store);
  return withCategory(row, store);
}

export function localDeleteBudget(id: string) {
  const store = load();
  store.budgets = store.budgets.filter((item) => item.id !== id);
  save(store);
}
