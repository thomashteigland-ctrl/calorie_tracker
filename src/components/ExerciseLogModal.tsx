import { useState } from "react";
import { addExerciseLog, deleteExerciseLog, updateExerciseLog } from "../api/exercise";
import type { ExerciseLog } from "../types/exercise";

type Props = {
  userId: string;
  loggedDate: string;
  entry?: ExerciseLog | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
};

export function ExerciseLogModal({ userId, loggedDate, entry, onClose, onSaved, onDeleted }: Props) {
  const isEdit = entry != null;
  const [name, setName] = useState(entry?.name ?? "");
  const [activeKcal, setActiveKcal] = useState(entry ? String(entry.active_kcal) : "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kcalNum = Number(activeKcal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !(kcalNum > 0)) return;

    setSaving(true);
    setError(null);
    try {
      if (isEdit && entry) {
        await updateExerciseLog(entry.id, { name: trimmed, active_kcal: kcalNum });
      } else {
        await addExerciseLog(userId, loggedDate, { name: trimmed, active_kcal: kcalNum });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save exercise");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteExerciseLog(entry.id);
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete exercise");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="exercise-log-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="exercise-log-title">{isEdit ? "Edit exercise" : "Add exercise"}</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Close
          </button>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="auth-form">
          <label className="portions-field">
            <span>Type</span>
            <input
              type="text"
              required
              placeholder="e.g. Running, gym, cycling"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="portions-field">
            <span>Active calories (kcal)</span>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={activeKcal}
              onChange={(e) => setActiveKcal(e.target.value)}
            />
          </label>

          {error ? (
            <p className="status status--error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={saving || !name.trim() || !(kcalNum > 0)}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add exercise"}
          </button>

          {isEdit ? (
            <button
              type="button"
              className="btn btn--ghost btn--block"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Removing…" : "Remove exercise"}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
