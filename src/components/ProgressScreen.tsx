import { useCallback, useEffect, useState } from "react";
import { getCumulativeCalorieProgress } from "../api/logs";
import { getWeightLogs, upsertWeightLog } from "../api/progress";
import { useAuth } from "../contexts/AuthContext";
import { todayLocalDate } from "../lib/dates";
import type { CumulativeProgress, WeightLog } from "../types/progress";

export function ProgressScreen() {
  const { user, goals } = useAuth();
  const [calorieProgress, setCalorieProgress] = useState<CumulativeProgress | null>(null);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !goals) return;
    setLoading(true);
    setError(null);
    try {
      const [cal, w] = await Promise.all([
        getCumulativeCalorieProgress(user.id, goals.daily_calories, 30),
        getWeightLogs(user.id, 30),
      ]);
      setCalorieProgress(cal);
      setWeights(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load progress");
    } finally {
      setLoading(false);
    }
  }, [user, goals]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const kg = Number(weightInput);
    if (!(kg > 0)) return;
    try {
      await upsertWeightLog(user.id, todayLocalDate(), kg);
      setWeightInput("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save weight");
    }
  }

  if (!user || !goals) return null;

  const balance = calorieProgress?.totalBalance ?? 0;
  const balanceLabel =
    balance < 0
      ? `${Math.abs(Math.round(balance))} kcal cumulative deficit`
      : balance > 0
        ? `${Math.round(balance)} kcal cumulative surplus`
        : "On target over the period";

  return (
    <div className="progress-screen">
      <h2 className="progress-screen__title">Progress</h2>
      {loading ? <p className="status">Loading…</p> : null}
      {error ? (
        <p className="status status--error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="progress-card">
        <h3>Calorie balance (30 days)</h3>
        <p className="progress-card__big">{balanceLabel}</p>
        <p className="progress-card__hint">
          Sum of (eaten − daily goal) per day. Negative = net deficit over time.
        </p>
        {calorieProgress ? (
          <ul className="progress-bars">
            {calorieProgress.days
              .filter((d) => d.consumed > 0)
              .slice(-14)
              .map((d) => (
                <li key={d.logged_date}>
                  <span className="progress-bars__date">{d.logged_date.slice(5)}</span>
                  <span
                    className={`progress-bars__val${d.balance < 0 ? " progress-bars__val--deficit" : ""}`}
                  >
                    {d.balance > 0 ? "+" : ""}
                    {Math.round(d.balance)} kcal
                  </span>
                </li>
              ))}
          </ul>
        ) : null}
      </section>

      <section className="progress-card">
        <h3>Weight</h3>
        <form onSubmit={handleSaveWeight} className="weight-form">
          <label>
            <span>Today&apos;s weight (kg)</span>
            <input
              type="number"
              step={0.1}
              min={20}
              max={300}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="e.g. 82.5"
            />
          </label>
          <button type="submit" className="btn btn--primary btn--small" disabled={!weightInput}>
            Save
          </button>
        </form>
        {weights.length > 0 ? (
          <ul className="weight-history">
            {weights.slice(0, 7).map((w) => (
              <li key={w.logged_date}>
                <span>{w.logged_date}</span>
                <span>{w.weight_kg} kg</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="status">No weight entries yet.</p>
        )}
      </section>

      <section className="progress-card progress-card--disabled">
        <h3>Steps</h3>
        <p className="status">Coming soon — connect a device or log steps manually.</p>
      </section>
    </div>
  );
}
