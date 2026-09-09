import { useCallback, useEffect, useState } from "react";
import { listRecurring, listTransfers } from "../services/ledger";
import type { AccountTransfer, RecurringRule } from "../types/database";

export function useTransfers() {
  const [data, setData] = useState<AccountTransfer[]>([]);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    listTransfers()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { data, reload };
}

export function useRecurring() {
  const [data, setData] = useState<RecurringRule[]>([]);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    listRecurring()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { data, reload };
}
