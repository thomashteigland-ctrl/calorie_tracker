import { macrosForLog } from "../lib/nutrients";
import { displayName } from "../types/food";
import type { FoodLogWithFood } from "../types/foodLog";

type Props = {
  entry: FoodLogWithFood;
  onOpen: () => void;
};

export function LogEntryRow({ entry, onOpen }: Props) {
  const kcal = Math.round(macrosForLog(entry.food, entry.portions).calories);

  return (
    <li>
      <button type="button" className="log-entry log-entry--clickable" onClick={onOpen}>
        <span className="log-entry__title">{displayName(entry.food)}</span>
        <span className="log-entry__kcal">{kcal} kcal</span>
      </button>
    </li>
  );
}
