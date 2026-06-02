type Props = {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  size?: "large" | "small";
  showRemaining?: boolean;
};

export function MacroDonut({
  label,
  current,
  goal,
  unit,
  color,
  size = "small",
  showRemaining = true,
}: Props) {
  const dim = size === "large" ? 120 : 72;
  const stroke = size === "large" ? 10 : 7;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const offset = c * (1 - pct);
  const remaining = Math.max(goal - current, 0);
  const centerValue = showRemaining ? Math.round(remaining) : Math.round(current);
  const centerSub = showRemaining ? "left" : "eaten";

  return (
    <div className={`macro-donut macro-donut--${size}`}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} aria-hidden="true">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
        />
      </svg>
      <div className="macro-donut__center">
        <span className="macro-donut__value">{centerValue}</span>
        <span className="macro-donut__sub">{centerSub}</span>
      </div>
      <span className="macro-donut__label">
        {label}
        <span className="macro-donut__detail">
          {Math.round(current)} / {Math.round(goal)} {unit}
        </span>
      </span>
    </div>
  );
}
