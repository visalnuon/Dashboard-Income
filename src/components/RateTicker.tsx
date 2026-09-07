import { useEffect, useState } from "react";
import { useCountUp } from "./CountMoney";
import { useLanguage } from "../hooks/useLanguage";

const RATES = [
  { code: "USD", flag: "🇺🇸", buy: 4100, sell: 4125, buyUp: true, sellUp: true },
  { code: "CNY", flag: "🇨🇳", buy: 572, sell: 586, buyUp: true, sellUp: true },
  { code: "EUR", flag: "🇪🇺", buy: 4584.2, sell: 4843.6, buyUp: true, sellUp: true },
];

function formatRate(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function RateCount({ value }: { value: number }) {
  const shown = useCountUp(value, 1100);
  return <strong>{formatRate(shown)}</strong>;
}

export function RateTicker() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const rate = RATES[index];

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % RATES.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="rate-ticker" aria-label={t("ticker.label")} aria-live="polite">
      <span className="rate-label">{t("ticker.label")}</span>
      <div className="rate-item rate-item-live" key={`${rate.code}-${index}`}>
        <span className="rate-flag" aria-hidden>{rate.flag}</span>
        <span className="rate-code">{rate.code}</span>
        <span className="rate-pair">
          <RateCount value={rate.buy} />
          <span className={rate.buyUp ? "rate-arrow up" : "rate-arrow down"} aria-hidden>
            {rate.buyUp ? "▲" : "▼"}
          </span>
        </span>
        <span className="rate-pair">
          <RateCount value={rate.sell} />
          <span className={rate.sellUp ? "rate-arrow up" : "rate-arrow down"} aria-hidden>
            {rate.sellUp ? "▲" : "▼"}
          </span>
        </span>
      </div>
    </div>
  );
}
