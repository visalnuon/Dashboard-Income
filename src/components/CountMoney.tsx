import { useEffect, useState } from "react";
import { formatMoney } from "../utils/format";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    const from = 0;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return shown;
}

export function CountMoney({
  value,
  hidden,
  signed = false,
  className,
}: {
  value: number;
  hidden?: boolean;
  signed?: boolean;
  className?: string;
}) {
  const shown = useCountUp(value);
  if (hidden) return <span className={className}>{formatMoney(value, { hidden: true })}</span>;
  return <span className={className}>{formatMoney(shown, { signed })}</span>;
}
