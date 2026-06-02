import { useState } from "react";
import { upsertGoals } from "../api/goals";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_GOALS } from "../types/goals";

export function GoalsSetup() {
  const { user, refreshGoals } = useAuth();
  const [calories, setCalories] = useState(String(DEFAULT_GOALS.daily_calories));
  const [protein, setProtein] = useState(String(DEFAULT_GOALS.daily_protein_g));
  const [carbs, setCarbs] = useState(String(DEFAULT_GOALS.daily_carbs_g));
  const [fat, setFat] = useState(String(DEFAULT_GOALS.daily_fat_g));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await upsertGoals(user.id, {
        daily_calories: Number(calories),
        daily_protein_g: Number(protein),
        daily_carbs_g: Number(carbs),
        daily_fat_g: Number(fat),
      });
      await refreshGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save goals");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Set your daily goals</h1>
        <p className="auth-card__lead">
          Targets for calories and macros. You can change these later.
        </p>

        <form onSubmit={handleSubmit} className="auth-form goals-form">
          <label>
            <span>Calories (kcal)</span>
            <input type="number" min={500} max={10000} required value={calories} onChange={(e) => setCalories(e.target.value)} />
          </label>
          <label>
            <span>Protein (g)</span>
            <input type="number" min={0} max={1000} required value={protein} onChange={(e) => setProtein(e.target.value)} />
          </label>
          <label>
            <span>Carbs (g)</span>
            <input type="number" min={0} max={2000} required value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </label>
          <label>
            <span>Fat (g)</span>
            <input type="number" min={0} max={500} required value={fat} onChange={(e) => setFat(e.target.value)} />
          </label>

          {error ? (
            <p className="status status--error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Saving…" : "Start logging"}
          </button>
        </form>
      </div>
    </div>
  );
}
