import { useState } from "react";
import { deleteFoodLog, updateFoodLogPortions } from "../api/logs";
import { listNutrientsForLog, macrosForLog } from "../lib/nutrients";
import { displayName } from "../types/food";
import type { FoodLogWithFood } from "../types/foodLog";

type Props = {
  entry: FoodLogWithFood;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
};

export function FoodLogDetailModal({ entry, onClose, onUpdated, onDeleted }: Props) {
  const [portions, setPortions] = useState(String(entry.portions));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portionNum = Number(portions);
  const macros = portionNum > 0 ? macrosForLog(entry.food, portionNum) : null;
  const nutrients = portionNum > 0 ? listNutrientsForLog(entry.food, portionNum) : [];

  async function handleSave() {
    if (!(portionNum > 0)) return;
    setSaving(true);
    setError(null);
    try {
      await updateFoodLogPortions(entry.id, portionNum);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteFoodLog(entry.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--tall"
        role="dialog"
        aria-labelledby="log-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="log-detail-title">{displayName(entry.food)}</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Close
          </button>
        </header>

        <label className="portions-field">
          <span>Portions (1 = 100 g)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={portions}
            onChange={(e) => setPortions(e.target.value)}
          />
        </label>

        {macros ? (
          <div className="log-detail-macros">
            <span>{Math.round(macros.calories)} kcal</span>
            <span>P {Math.round(macros.protein)} g</span>
            <span>C {Math.round(macros.carbs)} g</span>
            <span>F {Math.round(macros.fat)} g</span>
          </div>
        ) : null}

        <section className="log-detail-nutrients" aria-label="Nutrients">
          <h3 className="log-detail-nutrients__title">Nutrients (this serving)</h3>
          <ul className="nutrient-list">
            {nutrients.map((n) => (
              <li key={n.name}>
                <span>{n.name}</span>
                <span>{n.amount}</span>
              </li>
            ))}
          </ul>
        </section>

        {error ? (
          <p className="status status--error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="log-detail-actions">
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={saving || !(portionNum > 0)}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Update"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
