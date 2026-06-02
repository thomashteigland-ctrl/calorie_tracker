import { progressPercent, type MacroTotals } from "../lib/macros";
import type { UserGoals } from "../types/goals";

type Props = {
  totals: MacroTotals;
  goals: UserGoals;
};

function MacroBar({
  label,
  current,
  goal,
  unit,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
}) {
  const pct = progressPercent(current, goal);

  return (
    <div className="macro-bar">
      <div className="macro-bar__header">
        <span>{label}</span>
        <span>
          {Math.round(current)} / {Math.round(goal)} {unit}
        </span>
      </div>
      <div className="macro-bar__track">
        <div className="macro-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DailySummary({ totals, goals }: Props) {
  return (
    <section className="daily-summary" aria-label="Today's progress">
      <h2 className="daily-summary__title">Today</h2>
      <MacroBar label="Calories" current={totals.calories} goal={goals.daily_calories} unit="kcal" />
      <MacroBar label="Protein" current={totals.protein} goal={goals.daily_protein_g} unit="g" />
      <MacroBar label="Carbs" current={totals.carbs} goal={goals.daily_carbs_g} unit="g" />
      <MacroBar label="Fat" current={totals.fat} goal={goals.daily_fat_g} unit="g" />
    </section>
  );
}
