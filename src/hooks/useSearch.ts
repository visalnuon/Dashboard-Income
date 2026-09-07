import { useMemo, useState } from "react";

export function useSearch(initial = "") {
  const [search, setSearch] = useState(initial);
  const trimmed = useMemo(() => search.trim(), [search]);
  return { search, setSearch, trimmed, clear: () => setSearch("") };
}
