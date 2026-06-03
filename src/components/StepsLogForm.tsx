import { useEffect, useState } from "react";
import { getStepsForDate, upsertStepsForDate } from "../api/activity";
import { todayLocalDate } from "../lib/dates";
import { activityKcalFromSteps } from "../lib/activity";

type Props = {
  userId: string;
  weightKg: number | null;
};

export function StepsLogForm({ userId, weightKg }: Props) {
  const today = todayLocalDate();
  const [steps, setSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStepsForDate(userId, today)
      .then((value) => {
        if (cancelled) return;
        if (value != null) setSteps(String(value));
      })
      .catch(() => {
        if (!cancelled) setSteps("");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, today]);

  const stepsNum = Number(steps);
  const activityKcal =
    stepsNum > 0 && weightKg != null ? Math.round(activityKcalFromSteps(stepsNum, weightKg)) : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!(stepsNum >= 0)) return;

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await upsertStepsForDate(userId, today, stepsNum);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save steps");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="steps-log-form">
      <label>
        <span>Steps today</span>
        <input
          type="number"
          min={0}
          step={1}
          value={steps}
          onChange={(e) => {
            setSteps(e.target.value);
            setSaved(false);
          }}
          placeholder="0"
        />
      </label>
      {activityKcal != null ? (
        <p className="steps-log-form__hint">≈ {activityKcal} kcal activity in diary overview</p>
      ) : null}
      {error ? (
        <p className="status status--error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="status status--success">Saved</p> : null}
      <button type="submit" className="btn btn--primary btn--block" disabled={saving || steps === ""}>
        {saving ? "Saving…" : "Save steps"}
      </button>
    </form>
  );
}
