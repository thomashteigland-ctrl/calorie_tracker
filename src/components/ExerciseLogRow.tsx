import type { ExerciseLog } from "../types/exercise";

type Props = {
  entry: ExerciseLog;
  onOpen: () => void;
};

export function ExerciseLogRow({ entry, onOpen }: Props) {
  return (
    <li>
      <button type="button" className="log-entry log-entry--exercise" onClick={onOpen}>
        <span className="log-entry__badge">Exercise</span>
        <span className="log-entry__title">{entry.name}</span>
        <span className="log-entry__kcal">{Math.round(entry.active_kcal)} kcal</span>
      </button>
    </li>
  );
}
