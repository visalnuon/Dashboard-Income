import { useEffect, useState } from "react";

const MOBILE_MAX = 767;

export function useIsMobile(maxWidth = MOBILE_MAX) {
  const query = `(max-width: ${maxWidth}px)`;
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function preferredHomePath() {
  if (typeof window === "undefined") return "/dashboard";
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches ? "/mobile" : "/dashboard";
}
