import { useCallback, useEffect, useState } from "react";
import { listBudgets } from "../services/budgets";
import type { BudgetWithCategory } from "../types/database";

export function useBudgets(month?: number, year?: number) {
  const [data, setData] = useState<BudgetWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listBudgets(month, year)
      .then((rows) => {
        if (cancelled) return;
        setData(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load budgets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [month, year, version]);

  return { data, loading, error, reload };
}
