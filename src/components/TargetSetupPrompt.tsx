type Props = {
  configured: boolean;
  maintenanceKcal?: number | null;
  calorieGoal?: number | null;
  goalSummary?: string | null;
  /** Daily kcal vs maintenance (negative = deficit). */
  dailyAdjustment?: number | null;
  onOpen: () => void;
};

function dailyAdjustmentLabel(adjustment: number): string {
  if (Math.abs(adjustment) < 1) return "at maintenance";
  const kcal = Math.round(Math.abs(adjustment));
  return adjustment < 0 ? `${kcal} deficit/day` : `${kcal} surplus/day`;
}

export function TargetSetupPrompt({
  configured,
  maintenanceKcal,
  calorieGoal,
  goalSummary,
  dailyAdjustment,
  onOpen,
}: Props) {
  const primaryLine =
    configured && calorieGoal != null
      ? goalSummary
        ? `${goalSummary} · ${Math.round(calorieGoal)} kcal/day`
        : `${Math.round(calorieGoal)} kcal/day`
      : null;

  const maintenanceLine =
    configured && maintenanceKcal != null && dailyAdjustment != null
      ? `Maintenance ${Math.round(maintenanceKcal)} kcal/day (${dailyAdjustmentLabel(dailyAdjustment)})`
      : configured && maintenanceKcal != null
        ? `Maintenance ${Math.round(maintenanceKcal)} kcal/day`
        : null;

  return (
    <div className="target-prompt">
      <div className="target-prompt__text">
        <span className="target-prompt__label">Your target</span>
        {primaryLine ? (
          <span className="target-prompt__value">{primaryLine}</span>
        ) : (
          <span className="target-prompt__value target-prompt__value--muted">Not set up</span>
        )}
        {maintenanceLine ? <span className="target-prompt__sub">{maintenanceLine}</span> : null}
      </div>
      <button type="button" className="btn btn--ghost btn--small" onClick={onOpen}>
        {configured ? "Edit target" : "Set up target"}
      </button>
    </div>
  );
}
