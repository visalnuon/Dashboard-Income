import type { TranslationKey } from "./translations";

const SEED_NAMES: Record<string, TranslationKey> = {
  Salary: "seed.salary",
  Freelance: "seed.freelance",
  "Other income": "seed.otherIncome",
  Food: "seed.food",
  Transport: "seed.transport",
  Bills: "seed.bills",
  Shopping: "seed.shopping",
  Health: "seed.health",
  "Other expense": "seed.otherExpense",
  Cash: "acc.cash",
  Bank: "acc.bank",
  Card: "acc.card",
  Wallet: "acc.wallet",
};

const ERROR_MESSAGES: Record<string, TranslationKey> = {
  "This record is still in use and cannot be deleted.": "error.inUse",
  "An account with this email already exists.": "error.emailExists",
  "That username is already taken.": "validation.usernameTaken",
  "Incorrect email or password.": "error.badCredentials",
  "Incorrect username or password.": "toast.badLogin",
  "A record with these details already exists.": "error.duplicate",
  "Please confirm your email before signing in.": "error.confirmEmail",
  "You need to be signed in.": "toast.needAuth",
  "Only an admin can manage users.": "settings.adminOnly",
  "You cannot delete this account.": "settings.cannotDelete",
  "You cannot delete your own account.": "settings.cannotDeleteSelf",
  "You cannot change the built-in admin role.": "settings.cannotChangeAdmin",
  "User not found.": "settings.userNotFound",
  "Unable to load transactions.": "tx.loadError",
  "Unable to add transaction.": "error.saveFailed",
  "Unable to update transaction.": "error.saveFailed",
  "Unable to delete transaction.": "error.deleteFailed",
  "Unable to load categories.": "cat.loadError",
  "Unable to create category.": "error.saveFailed",
  "Unable to update category.": "error.saveFailed",
  "Unable to delete category.": "error.deleteFailed",
  "Unable to load accounts.": "acc.loadError",
  "Unable to create account.": "error.saveFailed",
  "Unable to update account.": "error.saveFailed",
  "Unable to delete account.": "error.deleteFailed",
  "Unable to load budgets.": "budget.loadError",
  "Unable to create budget.": "error.saveFailed",
  "Unable to update budget.": "error.saveFailed",
  "Unable to delete budget.": "error.deleteFailed",
  "Unable to load dashboard.": "dashboard.loadError",
  "Unable to sign in.": "toast.signInFail",
  "Unable to create your account.": "toast.registerFail",
  "Unable to sign out.": "nav.signOut",
  "Unable to load profile.": "error.loadFailed",
  "Unable to update profile.": "error.saveFailed",
  "Unable to update password.": "error.saveFailed",
  "Something went wrong": "toast.generic",
};

export function localizeName(name: string | null | undefined, t: (key: TranslationKey) => string) {
  if (!name) return "";
  const key = SEED_NAMES[name];
  return key ? t(key) : name;
}

export function localizeError(message: string | null | undefined, t: (key: TranslationKey) => string) {
  if (!message) return t("toast.generic");
  const key = ERROR_MESSAGES[message];
  return key ? t(key) : message;
}
