import { TargetSetupForm } from "./TargetSetupForm";

type Props = {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  /** When false, backdrop click and Close are hidden (first-time setup). */
  dismissible?: boolean;
};

export function TargetSetupModal({ onClose, onSaved, dismissible = true }: Props) {
  async function handleSaved() {
    await onSaved();
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className="modal modal--tall"
        role="dialog"
        aria-labelledby="target-setup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="target-setup-title">Your target</h2>
          {dismissible ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
              Close
            </button>
          ) : null}
        </header>
        <p className="modal__hint">
          Used for BMR, daily burn, and macro goals. Update weight here when it changes.
        </p>
        <TargetSetupForm onSaved={() => handleSaved()} />
      </div>
    </div>
  );
}
