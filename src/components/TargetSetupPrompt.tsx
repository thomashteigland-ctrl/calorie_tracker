type Props = {
  configured: boolean;
  maintenanceKcal?: number | null;
  onOpen: () => void;
};

export function TargetSetupPrompt({ configured, maintenanceKcal, onOpen }: Props) {
  return (
    <div className="target-prompt">
      <div className="target-prompt__text">
        <span className="target-prompt__label">Your target</span>
        {configured && maintenanceKcal != null ? (
          <span className="target-prompt__value">{Math.round(maintenanceKcal)} kcal/day maintenance</span>
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
