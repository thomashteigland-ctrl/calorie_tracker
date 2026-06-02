import { macrosForPortions } from "../lib/macros";
import { displayName } from "../types/food";
import type { FoodLogWithFood } from "../types/foodLog";

type Props = {
  entry: FoodLogWithFood;
  onDelete: () => void;
  deleting: boolean;
};

export function LogEntryRow({ entry, onDelete, deleting }: Props) {
  const macros = macrosForPortions(entry.food, entry.portions);
  const grams = Math.round(entry.portions * 100);

  return (
    <li className="log-entry">
      <div className="log-entry__main">
        <div className="log-entry__title">{displayName(entry.food)}</div>
        <div className="log-entry__meta">
          {entry.portions}×100 g ({grams} g) · {Math.round(macros.calories)} kcal
        </div>
      </div>
      <button type="button" className="btn btn--ghost btn--small" onClick={onDelete} disabled={deleting} aria-label="Remove log">
        {deleting ? "…" : "Remove"}
      </button>
    </li>
  );
}
