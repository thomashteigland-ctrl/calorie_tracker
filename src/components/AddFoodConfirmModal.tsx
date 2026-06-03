import { useState } from "react";
import { ensureFoodForLog } from "../api/foods";
import { addFoodLog } from "../api/logs";
import { createMeal } from "../api/meals";
import { macrosForPortions } from "../lib/macros";
import { displayName, type Food } from "../types/food";

type Props = {
  food: Food;
  mealName: string;
  userId: string;
  loggedDate: string;
  mealId: string | null;
  mealNumber: number;
  defaultPortions?: number;
  onClose: () => void;
  onMealCreated: (mealId: string, mealName: string) => void;
  onAdded: () => void;
};

export function AddFoodConfirmModal({
  food,
  mealName,
  userId,
  loggedDate,
  mealId,
  mealNumber,
  defaultPortions = 1,
  onClose,
  onMealCreated,
  onAdded,
}: Props) {
  const [portions, setPortions] = useState(String(defaultPortions));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portionNum = Number(portions);
  const preview = portionNum > 0 ? macrosForPortions(food, portionNum) : null;

  async function handleAdd() {
    if (!(portionNum > 0)) return;

    setSaving(true);
    setError(null);
    try {
      let activeMealId = mealId;

      if (!activeMealId) {
        const meal = await createMeal(userId, loggedDate, mealNumber);
        activeMealId = meal.id;
        onMealCreated(meal.id, meal.name);
      }

      const cached = await ensureFoodForLog(food, userId);
      await addFoodLog(userId, cached.id, portionNum, loggedDate, activeMealId);
      onAdded();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not add food";
      setError(message || "Could not add food");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop modal-backdrop--stack" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="add-food-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="add-food-confirm-title">{displayName(food)}</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="modal__hint">Adding to {mealName}</p>

        <label className="portions-field">
          <span>Portions (1 = 100 g)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={portions}
            onChange={(e) => setPortions(e.target.value)}
            autoFocus
          />
        </label>

        {preview ? (
          <p className="modal-add-panel__preview">
            {Math.round(preview.calories)} kcal · P {Math.round(preview.protein)} g · C{" "}
            {Math.round(preview.carbs)} g · F {Math.round(preview.fat)} g
          </p>
        ) : null}

        {error ? (
          <p className="status status--error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={saving || !(portionNum > 0)}
          onClick={() => void handleAdd()}
        >
          {saving ? "Adding…" : `Add to ${mealName}`}
        </button>
      </div>
    </div>
  );
}
