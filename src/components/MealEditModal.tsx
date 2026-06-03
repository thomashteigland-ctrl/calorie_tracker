import { useState } from "react";
import { deleteFoodLog } from "../api/logs";
import { deleteMeal, updateMealName } from "../api/meals";
import { macrosForLog } from "../lib/nutrients";
import { displayName } from "../types/food";
import { UNGROUPED_MEAL_ID } from "../lib/groupMeals";
import type { MealWithLogs } from "../types/meal";

type Props = {
  meal: MealWithLogs;
  onClose: () => void;
  onUpdated: () => void;
  onAddFood: () => void;
  onOpenFood: (logId: string) => void;
};

export function MealEditModal({ meal, onClose, onUpdated, onAddFood, onOpenFood }: Props) {
  const [name, setName] = useState(meal.name);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPersistedMeal = meal.id !== UNGROUPED_MEAL_ID;

  async function handleSaveName() {
    if (!isPersistedMeal) return;
    setSaving(true);
    setError(null);
    try {
      await updateMealName(meal.id, name);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save meal");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveLog(logId: string) {
    setDeletingId(logId);
    setError(null);
    try {
      await deleteFoodLog(logId);
      onUpdated();
      if (meal.logs.length <= 1 && isPersistedMeal) {
        await deleteMeal(meal.id);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove food");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--tall"
        role="dialog"
        aria-labelledby="meal-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="meal-edit-title">Edit meal</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Close
          </button>
        </header>

        {isPersistedMeal ? (
          <label className="portions-field">
            <span>Meal name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        ) : (
          <p className="modal__hint">{meal.name}</p>
        )}

        <ul className="meal-edit-list">
          {meal.logs.map((entry) => (
            <li key={entry.id} className="meal-edit-list__row">
              <button
                type="button"
                className="meal-edit-list__open"
                onClick={() => onOpenFood(entry.id)}
              >
                <span>{displayName(entry.food)}</span>
                <span>{Math.round(macrosForLog(entry.food, entry.portions).calories)} kcal</span>
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                disabled={deletingId === entry.id}
                onClick={() => void handleRemoveLog(entry.id)}
              >
                {deletingId === entry.id ? "…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>

        <p className="modal__hint">Tap a food to change its quantity.</p>

        {isPersistedMeal ? (
          <button type="button" className="btn btn--block meal-edit-add-btn" onClick={onAddFood}>
            Add food to meal
          </button>
        ) : null}

        {error ? (
          <p className="status status--error" role="alert">
            {error}
          </p>
        ) : null}

        {isPersistedMeal ? (
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={saving || !name.trim()}
            onClick={() => void handleSaveName()}
          >
            {saving ? "Saving…" : "Save meal"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
