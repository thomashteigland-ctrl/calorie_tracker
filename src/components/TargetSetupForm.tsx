import { useEffect, useMemo, useState } from "react";
import { upsertGoals } from "../api/goals";
import { upsertProfileEnergy } from "../api/profile";
import { getLatestWeight, upsertWeightLog } from "../api/progress";
import { useAuth } from "../contexts/AuthContext";
import { todayLocalDate } from "../lib/dates";
import {
  ACTIVITY_LABELS,
  ageFromBirthDate,
  dailyEnergy,
  type ActivityLevel,
  type Sex,
} from "../lib/energy";
import {
  assessCalorieAdjustment,
  computeWeightGoalPlan,
  formatWeightGoalSummary,
  macrosFromCalorieGoal,
} from "../lib/weightGoal";
import { GoalPlanPreview } from "./GoalPlanPreview";

type Props = {
  onSaved: () => void | Promise<void>;
};

export function TargetSetupForm({ onSaved }: Props) {
  const { user, goals, profile, applySavedTarget } = useAuth();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetWeeks, setTargetWeeks] = useState("12");
  const [loading, setLoading] = useState(false);
  const [prefillBusy, setPrefillBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function prefill() {
      setPrefillBusy(true);
      try {
        const latestWeight = await getLatestWeight(user!.id);
        if (cancelled) return;

        if (latestWeight != null) {
          setWeight(String(latestWeight));
          if (!goals?.target_weight_kg) setTargetWeight(String(latestWeight));
        }
        if (profile?.height_cm) setHeight(String(profile.height_cm));
        if (profile?.birth_date) setBirthDate(profile.birth_date);
        if (profile?.sex) setSex(profile.sex);
        if (profile?.activity_level) setActivityLevel(profile.activity_level);

        if (goals?.target_weight_kg) setTargetWeight(String(goals.target_weight_kg));
        if (goals?.target_weeks) setTargetWeeks(String(goals.target_weeks));
      } finally {
        if (!cancelled) setPrefillBusy(false);
      }
    }

    void prefill();
    return () => {
      cancelled = true;
    };
  }, [user, profile, goals]);

  const planPreview = useMemo(() => {
    const w = Number(weight);
    const target = Number(targetWeight);
    const weeks = Number(targetWeeks);
    const h = Number(height);
    if (!(w > 0 && target > 0 && weeks > 0 && h > 0 && birthDate)) return null;

    const age = ageFromBirthDate(birthDate);
    if (!(age >= 10 && age <= 120)) return null;

    const energy = dailyEnergy(w, h, age, sex, activityLevel);
    const plan = computeWeightGoalPlan(w, target, weeks, energy.tdee);
    const macros = macrosFromCalorieGoal(plan.dailyCalories, w);
    const timelineAssessment = assessCalorieAdjustment(energy.bmr, plan.requestedDailyAdjustment);
    const appliedAssessment = assessCalorieAdjustment(energy.bmr, plan.dailyAdjustment);

    return {
      energy,
      plan,
      macros,
      summary: formatWeightGoalSummary(target, weeks, plan.direction, plan.kgToChange),
      target,
      weeks,
      timelineAssessment,
      appliedAssessment,
    };
  }, [weight, targetWeight, targetWeeks, height, birthDate, sex, activityLevel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !planPreview) return;

    const w = Number(weight);
    const target = Number(targetWeight);
    const weeks = Number(targetWeeks);
    const h = Number(height);
    if (!(w > 0 && target > 0 && weeks > 0 && h > 0 && birthDate)) {
      setError("Enter your body details and weight goal.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const savedProfile = await upsertProfileEnergy(user.id, {
        height_cm: h,
        birth_date: birthDate,
        sex,
        activity_level: activityLevel,
      });
      await upsertWeightLog(user.id, todayLocalDate(), w);
      const savedGoals = await upsertGoals(user.id, {
        daily_calories: planPreview.plan.dailyCalories,
        daily_protein_g: planPreview.macros.daily_protein_g,
        daily_carbs_g: planPreview.macros.daily_carbs_g,
        daily_fat_g: planPreview.macros.daily_fat_g,
        target_weight_kg: target,
        target_weeks: weeks,
      });
      applySavedTarget(savedProfile, savedGoals);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  if (prefillBusy) {
    return <p className="status">Loading…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form goals-form">
      <fieldset className="goals-form__section">
        <legend>Your body</legend>
        <label>
          <span>Current weight (kg)</span>
          <input
            type="number"
            min={20}
            max={500}
            step={0.1}
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <label>
          <span>Height (cm)</span>
          <input
            type="number"
            min={100}
            max={250}
            required
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </label>
        <label>
          <span>Birth date</span>
          <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        <label>
          <span>Sex (for BMR)</span>
          <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          <span>Activity level</span>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((key) => (
              <option key={key} value={key}>
                {ACTIVITY_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        {planPreview ? (
          <p className="goals-form__tdee">
            BMR <strong>{Math.round(planPreview.energy.bmr)}</strong> kcal · Activity +
            {Math.round(planPreview.energy.activityKcal)} · Maintenance{" "}
            <strong>{Math.round(planPreview.energy.tdee)}</strong> kcal/day
          </p>
        ) : null}
      </fieldset>

      <fieldset className="goals-form__section">
        <legend>Your goal</legend>
        <label>
          <span>Target weight (kg)</span>
          <input
            type="number"
            min={20}
            max={500}
            step={0.1}
            required
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
          />
        </label>
        <label>
          <span>Weeks to reach it</span>
          <input
            type="number"
            min={1}
            max={104}
            step={1}
            required
            value={targetWeeks}
            onChange={(e) => setTargetWeeks(e.target.value)}
          />
        </label>
      </fieldset>

      {planPreview ? (
        <GoalPlanPreview
          summary={planPreview.summary}
          targetWeightKg={planPreview.target}
          targetWeeks={planPreview.weeks}
          plan={planPreview.plan}
          maintenanceKcal={planPreview.energy.tdee}
          bmr={planPreview.energy.bmr}
          timelineAssessment={planPreview.timelineAssessment}
          appliedAssessment={planPreview.appliedAssessment}
          macros={planPreview.macros}
        />
      ) : null}

      {error ? (
        <p className="status status--error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn--primary btn--block" disabled={loading || !planPreview}>
        {loading ? "Saving…" : "Save target"}
      </button>
    </form>
  );
}
