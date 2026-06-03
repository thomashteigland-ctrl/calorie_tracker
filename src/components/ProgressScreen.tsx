import { useCallback, useEffect, useState } from "react";
import { getDiaryStreakStats } from "../api/diary";
import { getWeightLogs } from "../api/progress";
import { useAuth } from "../contexts/AuthContext";
import type { DailyEnergy } from "../lib/energy";
import type { DiaryStreakStats, WeightLog } from "../types/progress";
import { StepsLogForm } from "./StepsLogForm";
import { TargetSetupPrompt } from "./TargetSetupPrompt";

type Props = {
  energy: DailyEnergy | null;
  weightKg: number | null;
  targetConfigured: boolean;
  goalSummary?: string | null;
  onOpenTarget: () => void;
};

export function ProgressScreen({
  energy,
  weightKg,
  targetConfigured,
  goalSummary,
  onOpenTarget,
}: Props) {
  const { user, goals } = useAuth();
  const [streak, setStreak] = useState<DiaryStreakStats | null>(null);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !goals) return;
    setLoading(true);
    setError(null);
    try {
      const [s, w] = await Promise.all([
        getDiaryStreakStats(user.id, goals.daily_calories),
        getWeightLogs(user.id, 30),
      ]);
      setStreak(s);
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

  if (!user || !goals) return null;

  const balance = streak?.totalBalance ?? 0;
  const balanceLabel = !streak?.canShowCumulative
    ? "Close your diary on consecutive days to build a streak"
    : balance < 0
      ? `${Math.abs(Math.round(balance))} kcal deficit (${streak.streakLength}-day streak)`
      : balance > 0
        ? `${Math.round(balance)} kcal surplus (${streak.streakLength}-day streak)`
        : `On target (${streak.streakLength}-day streak)`;

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
        <TargetSetupPrompt
          configured={targetConfigured}
          maintenanceKcal={energy?.tdee ?? null}
          calorieGoal={goals.daily_calories}
          goalSummary={goalSummary}
          onOpen={onOpenTarget}
        />
        {energy ? (
          <p className="energy-stats energy-stats--compact">
            <span>BMR {Math.round(energy.bmr)}</span>
            <span>Activity +{Math.round(energy.activityKcal)}</span>
            <span>Maintenance {Math.round(energy.tdee)} kcal</span>
          </p>
        ) : null}
      </section>

      <section className="progress-card">
        <h3>Diary streak</h3>
        <p className="progress-card__big">{streak?.streakLength ?? 0} days in a row</p>
        <p className="progress-card__hint">
          Only <strong>closed</strong> days count. Close each day in Diary when you&apos;re done logging.
        </p>

        {streak && streak.unclosedDates.length > 0 ? (
          <div className="progress-warn" role="alert">
            <strong>Unclosed days</strong> — cumulative balance pauses until these are closed:
            <ul>
              {streak.unclosedDates.slice(0, 8).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <h4 className="progress-card__sub">Cumulative balance (closed streak only)</h4>
        <p className={`progress-card__big${streak?.canShowCumulative ? "" : " progress-card__big--muted"}`}>
          {balanceLabel}
        </p>

        {streak && streak.streakDays.length > 0 ? (
          <ul className="progress-bars">
            {streak.streakDays.map((d) => (
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
        <h3>Weight history</h3>
        {weights.length > 0 ? (
          <ul className="weight-history">
            {weights.slice(0, 14).map((w) => (
              <li key={w.logged_date}>
                <span>{w.logged_date}</span>
                <span>{w.weight_kg} kg</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="status">No weight logged yet — add weight in your target.</p>
        )}
      </section>

      <section className="progress-card">
        <h3>Steps</h3>
        <p className="progress-card__hint">Logged steps feed the Burned column on your diary for today.</p>
        <StepsLogForm userId={user.id} weightKg={weightKg} />
      </section>
    </div>
  );
}
