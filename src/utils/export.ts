import type { TransactionWithRelations } from "../types/database";
import { formatMoney } from "./format";

function csvEscape(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function transactionsCsv(rows: TransactionWithRelations[]) {
  const header = ["Date", "Type", "Title", "Category", "Account", "Amount", "Note"];
  const lines = rows.map((row) =>
    [
      row.transaction_date,
      row.type,
      row.title,
      row.category?.name ?? "",
      row.account?.name ?? "",
      row.amount,
      row.description ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return `\uFEFF${[header.join(","), ...lines].join("\n")}`;
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printReport(title: string, lines: string[]) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
  if (!popup) return false;
  popup.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body { font-family: Inter, sans-serif; padding: 32px; color: #0f172a; }
      h1 { color: #06451F; font-size: 22px; }
      p { margin: 6px 0; font-size: 14px; }
    </style></head><body>
    <h1>${title}</h1>
    ${lines.map((line) => `<p>${line}</p>`).join("")}
    </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}

export function moneyLine(label: string, value: number) {
  return `${label}: ${formatMoney(value)}`;
}
