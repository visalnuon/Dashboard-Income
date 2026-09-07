type ProgressBarProps = {
  value: number;
  tone?: "ok" | "warn" | "over";
};

export function ProgressBar({ value, tone = "ok" }: ProgressBarProps) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className={`progress ${tone}`}>
      <div style={{ width: `${width}%` }} />
    </div>
  );
}
