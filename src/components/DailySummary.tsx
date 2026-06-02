import type { MacroTotals } from "../lib/macros";
import type { UserGoals } from "../types/goals";
import { MacroDonut } from "./MacroDonut";

type Props = {
  totals: MacroTotals;
  goals: UserGoals;
};

export function DailySummary({ totals, goals }: Props) {
  return (
    <section className="daily-summary" aria-label="Today's progress">
      <div className="macro-donuts">
        <MacroDonut
          label="Calories"
          current={totals.calories}
          goal={goals.daily_calories}
          unit="kcal"
          color="var(--accent)"
          size="large"
          showRemaining
        />
        <MacroDonut
          label="Protein"
          current={totals.protein}
          goal={goals.daily_protein_g}
          unit="g"
          color="#6eb5ff"
          showRemaining
        />
        <MacroDonut
          label="Carbs"
          current={totals.carbs}
          goal={goals.daily_carbs_g}
          unit="g"
          color="#f5c542"
          showRemaining
        />
        <MacroDonut
          label="Fat"
          current={totals.fat}
          goal={goals.daily_fat_g}
          unit="g"
          color="#f08c6d"
          showRemaining
        />
      </div>
    </section>
  );
}
