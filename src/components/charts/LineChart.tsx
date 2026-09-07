import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { useLanguage } from "../../hooks/useLanguage";
import { formatMoney } from "../../utils/format";

export type MonthlyPoint = {
  month: string;
  income: number;
  expense: number;
};

type Pt = { x: number; y: number };

function niceMax(value: number) {
  if (value <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(value));
  const units = Math.ceil(value / pow);
  const nice = units <= 1 ? 1 : units <= 2 ? 2 : units <= 4 ? 4 : units <= 5 ? 5 : units <= 8 ? 8 : 10;
  return nice * pow;
}

function formatAxis(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function spline(points: Pt[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function LineChart({ data }: { data: MonthlyPoint[] }) {
  const { t } = useLanguage();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollLeft = node.scrollWidth;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      node.scrollLeft += event.deltaY;
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [data.length]);

  if (data.length === 0) {
    return <div className="chart-empty">{t("chart.noActivity")}</div>;
  }

  const rawMax = Math.max(0, ...data.flatMap((item) => [item.income, item.expense]));
  const max = niceMax(rawMax);
  const height = 300;
  const top = 16;
  const bottom = 70;
  const innerH = height - top - bottom;
  const ticks = 4;
  const step = 92;
  const padX = 28;
  const plotW = padX * 2 + Math.max(data.length - 1, 1) * step;
  const xAt = (index: number) => padX + index * step;
  const yAt = (value: number) => top + innerH - (max > 0 ? (value / max) * innerH : 0);
  const incomePts = data.map((item, index) => ({ x: xAt(index), y: yAt(item.income) }));
  const expensePts = data.map((item, index) => ({ x: xAt(index), y: yAt(item.expense) }));
  const incomeLine = spline(incomePts);
  const expenseLine = spline(expensePts);
  const first = incomePts[0];
  const last = incomePts[incomePts.length - 1];
  const incomeArea = `${incomeLine} L ${last.x} ${top + innerH} L ${first.x} ${top + innerH} Z`;
  const baseY = top + innerH;
  const tickYs = Array.from({ length: ticks + 1 }, (_, n) => ({
    value: max - (max / ticks) * n,
    y: top + (innerH / ticks) * n,
  }));

  function scrollBy(offset: number) {
    scroller.current?.scrollBy({ left: offset, behavior: "smooth" });
  }

  return (
    <div className="area-chart-wrap">
      <div className="chart-frame">
        <button type="button" className="chart-nav prev" onClick={() => scrollBy(-280)} aria-label={t("dash.prevMonth")}>
          <Icon name="chevronLeft" />
        </button>
        <svg viewBox={`0 0 56 ${height}`} width="56" height={height} className="chart-y-axis" aria-hidden="true">
          {tickYs.map((tick) => (
            <g key={tick.value}>
              <line x1="52" x2="56" y1={tick.y} y2={tick.y} className="viz-grid" />
              <text x="48" y={tick.y + 4} textAnchor="end" className="viz-axis">{formatAxis(tick.value)}</text>
            </g>
          ))}
        </svg>
        <div className="chart-scroll" ref={scroller}>
          <svg
            viewBox={`0 0 ${plotW} ${height}`}
            width={plotW}
            height={height}
            preserveAspectRatio="none"
            className="line-chart area-chart"
            role="img"
            aria-label={t("chart.trendLabel")}
          >
            <defs>
              <linearGradient id="income-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d9a52" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3d9a52" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {tickYs.map((tick) => (
              <line key={`h-${tick.value}`} x1={0} x2={plotW} y1={tick.y} y2={tick.y} className="viz-grid" />
            ))}
            {data.map((_, index) => (
              <line key={`v-${index}`} x1={xAt(index)} x2={xAt(index)} y1={top} y2={baseY} className="viz-grid" />
            ))}
            <path d={incomeArea} fill="url(#income-area-fill)" />
            <path d={incomeLine} className="chart-line income-line" />
            <path d={expenseLine} className="chart-line expense-line" />
            {data.map((item, index) => {
              const hitX = xAt(index) - step / 2;
              const selected = active === index;
              return (
                <g key={`${item.month}-${index}`}>
                  {selected ? <line x1={xAt(index)} x2={xAt(index)} y1={top} y2={baseY} className="chart-guide" /> : null}
                  <circle cx={xAt(index)} cy={yAt(item.income)} r={selected ? 7 : 5} className="point income-point" />
                  <circle cx={xAt(index)} cy={yAt(item.expense)} r={selected ? 7 : 5} className="point expense-point" />
                  <text
                    x={xAt(index)}
                    y={height - 14}
                    textAnchor="end"
                    className={`viz-axis${selected ? " is-active" : ""}`}
                    transform={`rotate(-38 ${xAt(index)} ${height - 14})`}
                  >
                    {item.month}
                  </text>
                  <rect
                    x={hitX}
                    y={top}
                    width={step}
                    height={innerH + 24}
                    className="chart-hit"
                    onClick={() => setActive(index)}
                    onPointerEnter={() => setActive(index)}
                  />
                </g>
              );
            })}
          </svg>
          {active != null && data[active] ? (
            <div
              className="chart-tip"
              style={{
                left: xAt(active),
                top: 12,
              }}
            >
              <strong>{data[active].month}</strong>
              <span className="up">{t("common.income")} {formatMoney(data[active].income)}</span>
              <span className="down">{t("common.expense")} {formatMoney(data[active].expense)}</span>
            </div>
          ) : null}
        </div>
        <button type="button" className="chart-nav next" onClick={() => scrollBy(280)} aria-label={t("dash.nextMonth")}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <p className="chart-swipe">{t("dash.chartSwipe")}</p>
    </div>
  );
}
