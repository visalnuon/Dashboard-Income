import { useState } from "react";
import { createTransaction, deleteTransaction, updateTransaction } from "../services/transactions";
import type { TransactionInsert, TransactionUpdate } from "../types/database";
import { useLanguage } from "./useLanguage";
import { useToast } from "./useToast";

export function useTransactionMutations(onChange: () => void) {
  const { notify } = useToast();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  async function save(values: TransactionInsert, id?: string) {
    setSubmitting(true);
    try {
      if (id) {
        const update: TransactionUpdate = values;
        await updateTransaction(id, update);
        notify(t("toast.txUpdated"));
      } else {
        await createTransaction(values);
        notify(t("toast.txAdded"));
      }
      onChange();
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : t("toast.generic"), "error");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteTransaction(id);
      notify(t("toast.txDeleted"));
      onChange();
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : t("toast.generic"), "error");
      return false;
    }
  }

  return { save, remove, submitting };
}
