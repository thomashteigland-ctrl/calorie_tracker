import type { MacroTotals } from "../lib/macros";
import type { DailyEnergy } from "../lib/energy";
import type { UserGoals } from "../types/goals";
import { MacroDonut } from "./MacroDonut";
import { TargetSetupPrompt } from "./TargetSetupPrompt";

type Props = {
  totals: MacroTotals;
  goals: UserGoals;
  energy: DailyEnergy | null;
  targetConfigured: boolean;
  onOpenTarget: () => void;
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

export function DailySummary({
  totals,
  goals,
  energy,
  targetConfigured,
  onOpenTarget,
}: Props) {
  const maintenanceKcal = energy?.tdee ?? null;
  const target = maintenanceKcal ?? goals.daily_calories;
  const net = totals.calories - target;
  const netLabel = net > 0 ? "surplus" : net < 0 ? "deficit" : "on target";
  const netValue = Math.abs(Math.round(net));
  const burned =
    maintenanceKcal != null ? Math.round(energy?.tdee ?? 0) : 0;

  return (
    <section className="daily-summary" aria-label="Today's progress">
      <TargetSetupPrompt
        configured={targetConfigured}
        maintenanceKcal={maintenanceKcal}
        onOpen={onOpenTarget}
      />

      <div className="calorie-equation">
        <div className="calorie-equation__col">
          <span className="calorie-equation__value">{Math.round(totals.calories)}</span>
          <span className="calorie-equation__label">Consumed</span>
        </div>
        <div className="calorie-equation__col calorie-equation__col--center">
          <span className={`calorie-equation__net calorie-equation__net--${netLabel}`}>
            {netValue}
          </span>
          <span className="calorie-equation__label">kcal {netLabel}</span>
        </div>
        <div className="calorie-equation__col">
          <span className="calorie-equation__value">{burned}</span>
          <span className="calorie-equation__label">Burned</span>
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
