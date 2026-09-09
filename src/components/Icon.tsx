export type IconName =
  | "wave"
  | "sun"
  | "moon"
  | "wallet"
  | "eye"
  | "eyeOff"
  | "in"
  | "out"
  | "left"
  | "income"
  | "expense"
  | "accounts"
  | "budgets"
  | "copy"
  | "calendar"
  | "spark"
  | "daily"
  | "keep"
  | "pace"
  | "compare"
  | "chevronLeft"
  | "chevronRight"
  | "card"
  | "categories"
  | "help"
  | "search"
  | "settings"
  | "logout"
  | "home"
  | "menu"
  | "plus"
  | "close"
  | "target"
  | "transfer"
  | "more"
  | "file"
  | "bell"
  | "user";

const PATHS: Record<IconName, string> = {
  wave: "M7 11c1.5-2 3-3 5-3s3.2 1.2 4.2 2.4M4 14c2-3 4.2-4.5 7-4.5 2.2 0 3.8 1 5.2 2.6M9 17c.8-1.4 1.8-2 3-2s2 .7 2.8 1.8",
  sun: "M12 7.5A4.5 4.5 0 1 0 12 16.5 4.5 4.5 0 0 0 12 7.5ZM12 3.5v1.4M12 19.1v1.4M4.9 4.9l1 1M18.1 18.1l1 1M3.5 12h1.4M19.1 12h1.4M4.9 19.1l1-1M18.1 5.9l1-1",
  moon: "M16.5 13.2A6.2 6.2 0 0 1 10.2 5 6.4 6.4 0 1 0 16.5 13.2Z",
  wallet: "M4.8 8.2h14.4A1.8 1.8 0 0 1 21 10v8.2A1.8 1.8 0 0 1 19.2 20H4.8A1.8 1.8 0 0 1 3 18.2V8.2A1.8 1.8 0 0 1 4.8 6.4h11M16 13.8h.01M7 6.4l8.4-2.4 1.3 4",
  eye: "M2.8 12S6.2 6.8 12 6.8 21.2 12 21.2 12 17.8 17.2 12 17.2 2.8 12 2.8 12ZM12 14.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
  eyeOff: "M4 5.2 19.6 18.8M9.5 8.3A4.8 4.8 0 0 1 12 7.4c5.2 0 8.4 4.6 8.4 4.6a12 12 0 0 1-2.4 2.7M7.4 10.2S4.4 12 4.4 12s3.2 4.6 8.4 4.6a6 6 0 0 0 2.2-.4",
  in: "M12 19V6M7.5 10.5 12 6l4.5 4.5",
  out: "M12 5v13M7.5 13.5 12 18l4.5-4.5",
  left: "M5 12h14M14 7l5 5-5 5",
  income: "M12 19V8M8 12l4-4 4 4M5 19h14",
  expense: "M12 5v11M8 12l4 4 4-4M5 5h14",
  accounts: "M4 8.5h16v10H4zM8 8.5V6.8A2.8 2.8 0 0 1 10.8 4h2.4A2.8 2.8 0 0 1 16 6.8v1.7",
  budgets: "M12 21a8 8 0 1 0-8-8M12 13V8M16.5 16.2 12 13",
  copy: "M8.5 8.5h10v11h-10zM5.5 15.5v-10h10",
  calendar: "M7 4.5v3M17 4.5v3M4.8 8h14.4v11H4.8zM4.8 12h14.4",
  spark: "M12 4.5 13.4 9 18 10.2 13.4 11.5 12 16 10.6 11.5 6 10.2 10.6 9Z",
  daily: "M12 7v5l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  keep: "M8 12.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5v5.2H8zm0 0V10A4 4 0 0 1 12 6a4 4 0 0 1 4 4v2.5",
  pace: "M4 17h16M6 17V9M12 17V7M18 17v-4",
  compare: "M7 16V8M12 16V5M17 16v-6",
  chevronLeft: "M14.5 6 8.5 12l6 6",
  chevronRight: "M9.5 6l6 6-6 6",
  card: "M3.8 8.2A1.8 1.8 0 0 1 5.6 6.4h12.8A1.8 1.8 0 0 1 20.2 8.2v7.6a1.8 1.8 0 0 1-1.8 1.8H5.6A1.8 1.8 0 0 1 3.8 15.8ZM4 10.4h16",
  categories: "M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z",
  help: "M12 17.2h.01M9.4 9.2a2.6 2.6 0 1 1 3.4 2.5c-.8.4-1.3.9-1.3 1.8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  search: "M10.6 17.2a6.6 6.6 0 1 0 0-13.2 6.6 6.6 0 0 0 0 13.2ZM15.5 15.5 20 20",
  settings: "M12 15.2A3.2 3.2 0 1 0 12 8.8 3.2 3.2 0 0 0 12 15.2ZM4.8 12.8v-1.6l1.7-.5.7-1.6-1-1.5 1.1-1.1 1.5 1 .6-.7.5-1.7h1.6l.5 1.7.6.7 1.5-1 1.1 1.1-1 1.5.7 1.6 1.7.5v1.6l-1.7.5-.7 1.6 1 1.5-1.1 1.1-1.5-1-.6.7-.5 1.7h-1.6l-.5-1.7-.6-.7-1.5 1-1.1-1.1 1-1.5-.7-1.6Z",
  logout: "M10 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v11.6A1.7 1.7 0 0 0 6.2 19.5H10M14.5 16.5 19.5 12l-5-4.5M19.5 12H10",
  home: "M4.5 11.2 12 4.8l7.5 6.4M6.8 10.4V19h10.4v-8.6",
  menu: "M5 7h14M5 12h14M5 17h14",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM12 12h.01",
  transfer: "M7 8h10M14 5l3 3-3 3M17 16H7M10 19l-3-3 3-3",
  more: "M12 6.5h.01M12 12h.01M12 17.5h.01",
  file: "M8 4h7l5 5v11H8zM15 4v5h5",
  bell: "M12 4.8a5 5 0 0 1 5 5v2.4l1.4 2.6H5.6L7 12.2V9.8a5 5 0 0 1 5-5ZM10 18.2a2 2 0 0 0 4 0",
  user: "M12 12.8a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8ZM6.2 19a5.8 5.8 0 0 1 11.6 0",
};

export function TxKindIcon({ type, symbol }: { type: "income" | "expense"; symbol?: string | null }) {
  if (symbol) return <span className="tx-emoji" aria-hidden="true">{symbol}</span>;
  return <Icon name={type === "income" ? "income" : "expense"} />;
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ? `ui-icon ${className}` : "ui-icon"} aria-hidden="true">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
