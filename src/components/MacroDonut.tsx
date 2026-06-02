type Props = {
  current: number;
  goal: number;
  color: string;
  size?: "large" | "small";
};

export function MacroDonut({ current, goal, color, size = "small" }: Props) {
  const dim = size === "large" ? 120 : 56;
  const stroke = size === "large" ? 10 : 6;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const offset = c * (1 - pct);

  return (
    <div className={`macro-donut macro-donut--${size}`} aria-hidden="true">
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
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
        <span className="macro-donut__value">{Math.round(current)}</span>
        <span className="macro-donut__sub">g</span>
      </div>
    </div>
  );
}
