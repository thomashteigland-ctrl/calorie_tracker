export type Sex = "male" | "female" | "other";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "Light exercise 1–3 days/week",
  moderate: "Moderate exercise 3–5 days/week",
  active: "Hard exercise 6–7 days/week",
  very_active: "Very hard exercise / physical job",
};

/** Mifflin–St Jeor BMR (kcal/day). */
export function mifflinStJeorBmr(weightKg: number, heightCm: number, ageYears: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (sex === "male") return base + 5;
  if (sex === "female") return base - 161;
  return (base + 5 + (base - 161)) / 2;
}

export function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_MULTIPLIER[level];
}

export function ageFromBirthDate(birthDateIso: string, asOf = new Date()): number {
  const born = new Date(birthDateIso);
  let age = asOf.getFullYear() - born.getFullYear();
  const monthDiff = asOf.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < born.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

export type DailyEnergy = {
  bmr: number;
  activityKcal: number;
  tdee: number;
};

/** Total daily energy expenditure = BMR × activity multiplier. */
export function dailyEnergy(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
  activityLevel: ActivityLevel,
): DailyEnergy {
  const bmr = mifflinStJeorBmr(weightKg, heightCm, ageYears, sex);
  const mult = activityMultiplier(activityLevel);
  const tdee = bmr * mult;
  const activityKcal = tdee - bmr;
  return { bmr, activityKcal, tdee };
}

export function canComputeEnergy(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
  birthDate: string | null | undefined,
  sex: Sex | null | undefined,
): boolean {
  return (
    weightKg != null &&
    weightKg > 0 &&
    heightCm != null &&
    heightCm > 0 &&
    birthDate != null &&
    birthDate.length > 0 &&
    sex != null
  );
}
