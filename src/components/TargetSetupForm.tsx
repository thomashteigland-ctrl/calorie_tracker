import { useEffect, useMemo, useState } from "react";
import { upsertGoals } from "../api/goals";
import { updateProfileEnergy } from "../api/profile";
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
import { DEFAULT_GOALS } from "../types/goals";

type Props = {
  onSaved: () => void | Promise<void>;
};

export function TargetSetupForm({ onSaved }: Props) {
  const { user, goals, profile } = useAuth();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [calories, setCalories] = useState(String(DEFAULT_GOALS.daily_calories));
  const [protein, setProtein] = useState(String(DEFAULT_GOALS.daily_protein_g));
  const [carbs, setCarbs] = useState(String(DEFAULT_GOALS.daily_carbs_g));
  const [fat, setFat] = useState(String(DEFAULT_GOALS.daily_fat_g));
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

        if (latestWeight != null) setWeight(String(latestWeight));
        if (profile?.height_cm) setHeight(String(profile.height_cm));
        if (profile?.birth_date) setBirthDate(profile.birth_date);
        if (profile?.sex) setSex(profile.sex);
        if (profile?.activity_level) setActivityLevel(profile.activity_level);

        if (goals) {
          setCalories(String(goals.daily_calories));
          setProtein(String(goals.daily_protein_g));
          setCarbs(String(goals.daily_carbs_g));
          setFat(String(goals.daily_fat_g));
        }
      } finally {
        if (!cancelled) setPrefillBusy(false);
      }
    }

    void prefill();
    return () => {
      cancelled = true;
    };
  }, [user, profile, goals]);

  const energyPreview = useMemo(() => {
    const w = Number(weight);
    const h = Number(height);
    if (!(w > 0 && h > 0 && birthDate)) return null;
    const age = ageFromBirthDate(birthDate);
    if (!(age >= 10 && age <= 120)) return null;
    return dailyEnergy(w, h, age, sex, activityLevel);
  }, [weight, height, birthDate, sex, activityLevel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const w = Number(weight);
    const h = Number(height);
    if (!(w > 0 && h > 0 && birthDate)) {
      setError("Enter weight, height, and birth date.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateProfileEnergy(user.id, {
        height_cm: h,
        birth_date: birthDate,
        sex,
        activity_level: activityLevel,
      });
      await upsertWeightLog(user.id, todayLocalDate(), w);
      await upsertGoals(user.id, {
        daily_calories: Number(calories),
        daily_protein_g: Number(protein),
        daily_carbs_g: Number(carbs),
        daily_fat_g: Number(fat),
      });
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
        <legend>Body</legend>
        <label>
          <span>Weight (kg)</span>
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
        {energyPreview ? (
          <p className="goals-form__tdee">
            BMR <strong>{Math.round(energyPreview.bmr)}</strong> kcal · Activity +
            {Math.round(energyPreview.activityKcal)} · Maintenance{" "}
            <strong>{Math.round(energyPreview.tdee)}</strong> kcal/day
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setCalories(String(Math.round(energyPreview.tdee)))}
            >
              Use as calorie goal
            </button>
          </p>
        ) : null}
      </fieldset>

      <fieldset className="goals-form__section">
        <legend>Daily goals</legend>
        <label>
          <span>Calories (kcal)</span>
          <input
            type="number"
            min={500}
            max={10000}
            required
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </label>
        <label>
          <span>Protein (g)</span>
          <input
            type="number"
            min={0}
            max={1000}
            required
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </label>
        <label>
          <span>Carbs (g)</span>
          <input
            type="number"
            min={0}
            max={2000}
            required
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
        </label>
        <label>
          <span>Fat (g)</span>
          <input
            type="number"
            min={0}
            max={500}
            required
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </label>
      </fieldset>

      {error ? (
        <p className="status status--error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
        {loading ? "Saving…" : "Save target"}
      </button>
    </form>
  );
}
