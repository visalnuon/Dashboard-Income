import { useCallback, useState } from "react";

const STORAGE_KEY = "visal-hide-balance";

export function useHiddenBalance() {
  const [hidden, setHidden] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return { hidden, toggle };
}
