import type { CalorieAdjustmentAssessment, WeightGoalPlan } from "../lib/weightGoal";

type Props = {
  summary: string;
  targetWeightKg: number;
  targetWeeks: number;
  plan: WeightGoalPlan;
  maintenanceKcal: number;
  bmr: number;
  timelineAssessment: CalorieAdjustmentAssessment;
  appliedAssessment: CalorieAdjustmentAssessment | null;
  macros: { daily_protein_g: number; daily_carbs_g: number; daily_fat_g: number };
};

function formatAdjustmentLabel(assessment: CalorieAdjustmentAssessment): string {
  if (assessment.level === "maintain") return "No daily adjustment";
  const kind = assessment.isDeficit ? "deficit" : "surplus";
  return `${assessment.dailyKcal} kcal/day ${kind} · ${Math.round(assessment.bmrPercent)}% of BMR`;
}

export function GoalPlanPreview({
  summary,
  targetWeightKg,
  targetWeeks,
  plan,
  maintenanceKcal,
  bmr,
  timelineAssessment,
  appliedAssessment,
  macros,
}: Props) {
  const showApplied =
    plan.capped && appliedAssessment && appliedAssessment.dailyKcal !== timelineAssessment.dailyKcal;

  const adjustmentKind =
    timelineAssessment.level === "maintain"
      ? "adjustment"
      : timelineAssessment.isDeficit
        ? "deficit"
        : "surplus";

  return (
    <section className="goal-plan-card" aria-live="polite">
      <header className="goal-plan-card__header">
        <span className="goal-plan-card__eyebrow">Your plan</span>
        <h3 className="goal-plan-card__headline">{summary}</h3>
        <p className="goal-plan-card__meta">
          Target {targetWeightKg} kg · {targetWeeks} week{targetWeeks === 1 ? "" : "s"}
        </p>
      </header>

      <div className="goal-plan-card__goal">
        <span className="goal-plan-card__goal-label">Daily calorie goal</span>
        <span className="goal-plan-card__goal-value">{plan.dailyCalories}</span>
        <span className="goal-plan-card__goal-unit">kcal/day</span>
      </div>

      <dl className="goal-plan-card__stats">
        <div>
          <dt>Maintenance</dt>
          <dd>{Math.round(maintenanceKcal)} kcal/day</dd>
        </div>
        <div>
          <dt>BMR</dt>
          <dd>{Math.round(bmr)} kcal/day</dd>
        </div>
      </dl>

      <div
        className={`goal-plan-card__assessment goal-plan-card__assessment--${timelineAssessment.level}`}
      >
        <span className="goal-plan-card__assessment-label">Estimated {adjustmentKind}</span>
        <p className="goal-plan-card__assessment-value">{formatAdjustmentLabel(timelineAssessment)}</p>
        <p className={`goal-plan-card__rating goal-plan-card__rating--${timelineAssessment.level}`}>
          {timelineAssessment.label}
        </p>
        <p className="goal-plan-card__assessment-desc">{timelineAssessment.description}</p>
      </div>

      {showApplied && appliedAssessment ? (
        <p className="goal-plan-card__capped">
          Daily goal uses a{" "}
          <strong>
            {appliedAssessment.dailyKcal} kcal/day {appliedAssessment.isDeficit ? "deficit" : "surplus"}
          </strong>{" "}
          ({Math.round(appliedAssessment.bmrPercent)}% of BMR) after safety limits.
        </p>
      ) : null}

      <p className="goal-plan-card__macros">
        Macros · Protein {macros.daily_protein_g} g · Carbs {macros.daily_carbs_g} g · Fat{" "}
        {macros.daily_fat_g} g
      </p>
    </section>
  );
}
