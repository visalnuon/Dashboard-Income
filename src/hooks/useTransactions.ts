import { useCallback, useEffect, useState } from "react";
import { listAllTransactions, listTransactions } from "../services/transactions";
import type { TransactionFilters, TransactionWithRelations } from "../types/database";

export function useTransactions(filters: TransactionFilters, enabled = true) {
  const [data, setData] = useState<TransactionWithRelations[]>([]);
  const [all, setAll] = useState<TransactionWithRelations[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const key = JSON.stringify(filters);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);

    listTransactions(filters)
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setAll(result.all);
        setCount(result.count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load transactions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, key, version]);

  return { data, all, count, loading, error, reload };
}

export function useAllTransactions(filters: Omit<TransactionFilters, "page" | "pageSize">, enabled = true) {
  const [data, setData] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const key = JSON.stringify(filters);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);

    listAllTransactions(filters)
      .then((rows) => {
        if (cancelled) return;
        setData(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load transactions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, key, version]);

  return { data, loading, error, reload };
}
