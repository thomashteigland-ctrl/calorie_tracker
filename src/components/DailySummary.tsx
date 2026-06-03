import type { MacroTotals } from "../lib/macros";
import type { DailyEnergy } from "../lib/energy";
import { dailyCalorieProgress } from "../lib/target";
import type { UserGoals } from "../types/goals";
import { MacroDonut } from "./MacroDonut";

type Props = {
  totals: MacroTotals;
  goals: UserGoals;
  energy: DailyEnergy | null;
  loggedActivityKcal: number;
};

const MACRO_COLORS = {
  protein: "#6eb5ff",
  carbs: "#f5c542",
  fat: "#f08c6d",
};

function MacroLine({
  label,
  current,
  goal,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
}) {
  return (
    <div className="macro-line">
      <MacroDonut current={current} goal={goal} color={color} />
      <div className="macro-line__body">
        <div className="macro-line__header">
          <span className="macro-line__label">{label}</span>
          <span className="macro-line__stats">
            {Math.round(current)} / {Math.round(goal)} g
          </span>
        </div>
      </div>
    </div>
  );
}

export function DailySummary({ totals, goals, energy, loggedActivityKcal }: Props) {
  const calorieGoal = goals.daily_calories;
  const consumed = totals.calories;
  const burned = Math.round(loggedActivityKcal);
  const { kcalBalance, balanceLabel, onTrack } = dailyCalorieProgress(
    consumed,
    calorieGoal,
    energy,
    loggedActivityKcal,
  );

  const balanceDisplayLabel =
    balanceLabel === "surplus"
      ? "Kcal surplus"
      : balanceLabel === "deficit"
        ? "Kcal deficit"
        : "Balanced";

  return (
    <section className="daily-summary" aria-label="Today's progress">
      <div className="calorie-tracker">
        {energy ? (
          <p className="calorie-tracker__bmr">
            BMR <strong>{Math.round(energy.bmr)}</strong> kcal/day
          </p>
        ) : null}
        <div className="calorie-equation">
          <div className="calorie-equation__col">
            <span className="calorie-equation__value">{Math.round(consumed)}</span>
            <span className="calorie-equation__label">Consumed</span>
          </div>

          <div className="calorie-equation__col">
            <span className="calorie-equation__value">{burned}</span>
            <span className="calorie-equation__label">Burned</span>
          </div>

          <div className="calorie-equation__col">
            <span
              className={`calorie-equation__net calorie-equation__net--${onTrack ? "good" : "bad"}`}
            >
              {kcalBalance != null ? Math.abs(Math.round(kcalBalance)) : "—"}
            </span>
            <span className="calorie-equation__label">{balanceDisplayLabel}</span>
          </div>
        </div>
      </div>

      <div className="macro-lines">
        <MacroLine
          label="Protein"
          current={totals.protein}
          goal={goals.daily_protein_g}
          color={MACRO_COLORS.protein}
        />
        <MacroLine
          label="Carbs"
          current={totals.carbs}
          goal={goals.daily_carbs_g}
          color={MACRO_COLORS.carbs}
        />
        <MacroLine
          label="Fat"
          current={totals.fat}
          goal={goals.daily_fat_g}
          color={MACRO_COLORS.fat}
        />
      </div>
    </section>
  );
}
