export type TransactionType = "income" | "expense";
export type AccountType = "cash" | "bank" | "card" | "wallet";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role?: "admin" | "user" | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  title: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
};

export type TransactionWithRelations = Transaction & {
  category: Pick<Category, "id" | "name" | "icon" | "type"> | null;
  account: Pick<Account, "id" | "name" | "type"> | null;
};

export type BudgetWithCategory = Budget & {
  category: Pick<Category, "id" | "name" | "icon" | "type"> | null;
};

export type TransactionInsert = {
  account_id: string;
  category_id: string;
  type: TransactionType;
  title: string;
  amount: number;
  description: string | null;
  transaction_date: string;
};

export type TransactionUpdate = Partial<TransactionInsert>;

export type CategoryInsert = {
  name: string;
  type: TransactionType;
  icon: string;
};

export type AccountInsert = {
  name: string;
  type: AccountType;
  balance?: number;
};

export type BudgetInsert = {
  category_id: string;
  amount: number;
  month: number;
  year: number;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SavingsGoalInsert = {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

export type SavingsGoalUpdate = Partial<SavingsGoalInsert>;

export type AccountTransfer = {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  note: string | null;
  created_at: string;
};

export type AccountTransferInsert = {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  note: string | null;
};

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export type RecurringRule = {
  id: string;
  user_id: string;
  type: TransactionType;
  title: string;
  amount: number;
  category_id: string;
  account_id: string;
  frequency: RecurringFrequency;
  next_date: string;
  note: string | null;
  created_at: string;
};

export type RecurringRuleInsert = {
  type: TransactionType;
  title: string;
  amount: number;
  category_id: string;
  account_id: string;
  frequency: RecurringFrequency;
  next_date: string;
  note: string | null;
};

export type DatePreset =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "custom";

export type DateRange = {
  from: string;
  to: string;
};

export type TransactionFilters = {
  search?: string;
  type?: TransactionType | "";
  categoryId?: string;
  accountId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert & { user_id?: string };
        Update: Partial<CategoryInsert>;
        Relationships: [];
      };
      accounts: {
        Row: Account;
        Insert: AccountInsert & { user_id?: string };
        Update: Partial<Omit<AccountInsert, "balance">>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert & { user_id?: string };
        Update: TransactionUpdate;
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: Budget;
        Insert: BudgetInsert & { user_id?: string };
        Update: Partial<BudgetInsert>;
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      login_app_user: {
        Args: { p_username: string; p_password: string };
        Returns: Record<string, unknown>;
      };
      register_app_user: {
        Args: {
          p_full_name: string;
          p_username: string;
          p_password: string;
          p_role?: string;
          p_admin_token?: string | null;
        };
        Returns: Record<string, unknown>;
      };
      admin_list_app_users: {
        Args: { p_token: string };
        Returns: Record<string, unknown>[];
      };
      admin_update_app_user_role: {
        Args: { p_token: string; p_user_id: string; p_role: string };
        Returns: Record<string, unknown>;
      };
      admin_delete_app_user: {
        Args: { p_token: string; p_user_id: string };
        Returns: Record<string, unknown>;
      };
      load_app_finance: {
        Args: { p_token: string };
        Returns: Record<string, unknown>;
      };
      save_app_finance: {
        Args: { p_token: string; p_payload: Record<string, unknown> };
        Returns: Record<string, unknown>;
      };
      update_app_user_name: {
        Args: { p_token: string; p_full_name: string };
        Returns: Record<string, unknown>;
      };
      update_app_user_password: {
        Args: { p_token: string; p_password: string };
        Returns: Record<string, unknown>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
