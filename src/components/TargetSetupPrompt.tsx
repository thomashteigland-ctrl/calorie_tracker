type Props = {
  configured: boolean;
  maintenanceKcal?: number | null;
  calorieGoal?: number | null;
  goalSummary?: string | null;
  onOpen: () => void;
};

export function TargetSetupPrompt({
  configured,
  maintenanceKcal,
  calorieGoal,
  goalSummary,
  onOpen,
}: Props) {
  return (
    <div className="target-prompt">
      <div className="target-prompt__text">
        <span className="target-prompt__label">Your target</span>
        {configured && calorieGoal != null ? (
          <>
            <span className="target-prompt__value">{Math.round(calorieGoal)} kcal/day goal</span>
            {goalSummary ? (
              <span className="target-prompt__sub">{goalSummary}</span>
            ) : null}
            {maintenanceKcal != null ? (
              <span className="target-prompt__sub">
                Maintenance {Math.round(maintenanceKcal)} kcal/day
              </span>
            ) : null}
          </>
        ) : (
          <span className="target-prompt__value target-prompt__value--muted">Not set up</span>
        )}
      </div>
      <button type="button" className="btn btn--ghost btn--small" onClick={onOpen}>
        {configured ? "Edit target" : "Set up target"}
      </button>
    </div>
  );
}
