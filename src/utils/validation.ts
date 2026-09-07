import type { AccountType, TransactionType } from "../types/database";

export type FieldErrors = Record<string, string>;

const ACCOUNT_TYPES: AccountType[] = ["cash", "bank", "card", "wallet"];
const TRANSACTION_TYPES: TransactionType[] = ["income", "expense"];

export function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

export function isAccountType(value: string): value is AccountType {
  return ACCOUNT_TYPES.includes(value as AccountType);
}

export function validateTransaction(values: {
  type: string;
  title: string;
  amount: string;
  categoryId: string;
  accountId: string;
  date: string;
}) {
  const errors: FieldErrors = {};

  if (!isTransactionType(values.type)) errors.type = "validation.typeRequired";
  if (!values.title.trim()) errors.title = "validation.titleRequired";
  const amount = Number(values.amount);
  if (!values.amount || Number.isNaN(amount) || amount <= 0) {
    errors.amount = "validation.amountRequired";
  }
  if (!values.categoryId) errors.categoryId = "validation.categoryRequired";
  if (!values.accountId) errors.accountId = "validation.accountRequired";
  if (!values.date) errors.date = "validation.dateRequired";

  return errors;
}

export function validateCategory(values: { name: string; type: string; icon: string }) {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = "validation.categoryNameRequired";
  if (!isTransactionType(values.type)) errors.type = "validation.typeIncomeExpense";
  if (!values.icon.trim()) errors.icon = "validation.iconRequired";
  return errors;
}

export function validateAccount(values: { name: string; type: string; balance: string }) {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = "validation.accountNameRequired";
  if (!isAccountType(values.type)) errors.type = "validation.accountType";
  if (values.balance !== "") {
    const balance = Number(values.balance);
    if (Number.isNaN(balance)) errors.balance = "validation.balanceNumber";
  }
  return errors;
}

export function validateBudget(values: {
  categoryId: string;
  amount: string;
  month: string;
  year: string;
}) {
  const errors: FieldErrors = {};
  if (!values.categoryId) errors.categoryId = "validation.categoryRequired";
  const amount = Number(values.amount);
  if (!values.amount || Number.isNaN(amount) || amount <= 0) {
    errors.amount = "validation.budgetAmount";
  }
  const month = Number(values.month);
  if (!month || month < 1 || month > 12) errors.month = "validation.monthRequired";
  const year = Number(values.year);
  if (!year || year < 2000 || year > 2100) errors.year = "validation.yearRequired";
  return errors;
}

export function validateAuth(values: { email: string; password: string; fullName?: string }, mode: "login" | "register") {
  const errors: FieldErrors = {};
  if (mode === "register" && !values.fullName?.trim()) {
    errors.fullName = "validation.fullNameRequired";
  }
  if (!values.email.trim()) errors.email = "validation.emailRequired";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "validation.emailInvalid";
  }
  if (!values.password) errors.password = "validation.passwordRequired";
  else if (mode === "register" && values.password.length < 6) {
    errors.password = "validation.passwordLength";
  }
  return errors;
}

export function validateRegister(values: { fullName: string; username: string; password: string }) {
  const errors: FieldErrors = {};
  if (!values.fullName.trim()) errors.fullName = "validation.fullNameRequired";
  if (!values.username.trim()) errors.username = "validation.usernameRequired";
  else if (values.username.trim().length < 3) errors.username = "validation.usernameLength";
  if (!values.password) errors.password = "validation.passwordRequired";
  else if (values.password.length < 6) errors.password = "validation.passwordLength";
  return errors;
}

export function validateLogin(values: { username: string; password: string }) {
  const errors: FieldErrors = {};
  if (!values.username.trim()) errors.username = "validation.usernameRequired";
  if (!values.password) errors.password = "validation.passwordRequired";
  return errors;
}

export function friendlyError(error: unknown, fallback = "Something went wrong") {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (message.includes("already registered") || message.includes("already been registered")) {
      return "An account with this email already exists.";
    }
    if (message.includes("Invalid login credentials")) {
      return "Incorrect email or password.";
    }
    if (message.includes("violates unique constraint")) {
      return "A record with these details already exists.";
    }
    if (message.includes("violates foreign key constraint")) {
      return "This record is still in use and cannot be deleted.";
    }
    if (message.includes("Email not confirmed")) {
      return "Please confirm your email before signing in.";
    }
  }
  return fallback;
}
