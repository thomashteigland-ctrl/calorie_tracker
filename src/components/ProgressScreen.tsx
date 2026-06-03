import { useCallback, useEffect, useMemo, useState } from "react";
import { getDiaryStreakStats } from "../api/diary";
import { getWeightLogs } from "../api/progress";
import { useAuth } from "../contexts/AuthContext";
import { buildCumulativeDeficitSeries } from "../lib/cumulativeDeficit";
import { formatNavDate, todayLocalDate } from "../lib/dates";
import type { DailyEnergy } from "../lib/energy";
import { computeWeightGoalPlan, type WeightGoalDirection } from "../lib/weightGoal";
import type { DiaryStreakStats, WeightLog } from "../types/progress";
import { CumulativeDeficitChart } from "./CumulativeDeficitChart";
import { StepsLogForm } from "./StepsLogForm";
import { TargetSetupPrompt } from "./TargetSetupPrompt";

type Props = {
  energy: DailyEnergy | null;
  weightKg: number | null;
  targetConfigured: boolean;
  goalSummary?: string | null;
  onOpenTarget: () => void;
  onGoToDiaryDay: (loggedDate: string) => void;
};

export function ProgressScreen({
  energy,
  weightKg,
  targetConfigured,
  goalSummary,
  onOpenTarget,
  onGoToDiaryDay,
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

  const today = todayLocalDate();

  const goalPlan = useMemo(() => {
    if (!energy || !goals || weightKg == null) return null;
    if (goals.target_weight_kg == null || goals.target_weeks == null) return null;
    try {
      return computeWeightGoalPlan(weightKg, goals.target_weight_kg, goals.target_weeks, energy.tdee);
    } catch {
      return null;
    }
  }, [energy, goals, weightKg]);

  const deficitSeries = useMemo(() => {
    if (!streak?.streakDays.length || !energy) return [];
    const direction: WeightGoalDirection = goalPlan?.direction ?? "maintain";
    const dailyAdjustment = goalPlan?.dailyAdjustment ?? 0;
    return buildCumulativeDeficitSeries(
      streak.streakDays,
      energy.tdee,
      dailyAdjustment,
      direction,
    );
  }, [streak, energy, goalPlan]);

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
          dailyAdjustment={goalPlan?.dailyAdjustment ?? null}
          onOpen={onOpenTarget}
        />
      </section>

      <section className="progress-card progress-card--streak">
        <div className="streak-hero">
          <span className="streak-hero__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" focusable="false">
              <path
                fill="currentColor"
                d="M12 2c1.5 3 4 5.2 4 9.5a4 4 0 0 1-8 0C8 7.2 10.5 5 12 2zm0 20a7 7 0 0 0 7-7c0-3.5-2.5-6.2-5.5-9.5C13 6.5 12.5 6 12 6s-1 .5-1.5 1.5C7.5 10.8 5 13.5 5 15a7 7 0 0 0 7 7z"
              />
            </svg>
          </span>
          <span className="streak-hero__count">{streak?.streakLength ?? 0}</span>
        </div>

        {streak && streak.unclosedDates.length > 0 ? (
          <div className="progress-warn">
            <h4 className="progress-warn__title">Unclosed days</h4>
            <ul className="progress-warn__days">
              {streak.unclosedDates.slice(0, 8).map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    className="progress-warn__day-btn"
                    onClick={() => onGoToDiaryDay(d)}
                  >
                    {formatNavDate(d, today)}
                  </button>
                </li>
              ))}
            </ul>
            <p className="progress-warn__hint">Cumulative balance pauses until these are closed.</p>
          </div>
        ) : null}

        <h4 className="progress-card__sub progress-card__sub--chart">Cumulative deficit vs plan</h4>

        {energy ? (
          <CumulativeDeficitChart points={deficitSeries} />
        ) : (
          <p className="status">Set up your target to see deficit tracking vs maintenance.</p>
        )}
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
