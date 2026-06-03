/** Approximate kcal stored or released per kg of body mass change. */
export const KCAL_PER_KG_BODY_MASS = 7700;

export type WeightGoalDirection = "lose" | "gain" | "maintain";

export type WeightGoalPlan = {
  dailyCalories: number;
  /** Difference from maintenance TDEE (negative = deficit). */
  dailyAdjustment: number;
  /** Adjustment implied by the timeline before safety caps. */
  requestedDailyAdjustment: number;
  totalEnergyDelta: number;
  kgToChange: number;
  direction: WeightGoalDirection;
  /** True when the requested timeline needs a larger adjustment than we allow. */
  capped: boolean;
};

const MAX_DAILY_DEFICIT = 1000;
const MAX_DAILY_SURPLUS = 500;
const MIN_DAILY_CALORIES = 1200;

/** Back-calculate a daily calorie target from current weight, target weight, and timeline. */
export function computeWeightGoalPlan(
  currentWeightKg: number,
  targetWeightKg: number,
  weeks: number,
  tdee: number,
): WeightGoalPlan {
  if (!(weeks > 0) || !(currentWeightKg > 0) || !(targetWeightKg > 0) || !(tdee > 0)) {
    throw new Error("Invalid weight goal inputs.");
  }

  const kgDelta = targetWeightKg - currentWeightKg;

  if (Math.abs(kgDelta) < 0.1) {
    const rounded = Math.round(tdee);
    return {
      dailyCalories: rounded,
      dailyAdjustment: 0,
      requestedDailyAdjustment: 0,
      totalEnergyDelta: 0,
      kgToChange: 0,
      direction: "maintain",
      capped: false,
    };
  }

  const days = weeks * 7;
  const totalEnergyDelta = kgDelta * KCAL_PER_KG_BODY_MASS;
  const requestedAdjustment = totalEnergyDelta / days;
  let dailyAdjustment = requestedAdjustment;
  let capped = false;

  if (requestedAdjustment < -MAX_DAILY_DEFICIT) {
    dailyAdjustment = -MAX_DAILY_DEFICIT;
    capped = true;
  } else if (requestedAdjustment > MAX_DAILY_SURPLUS) {
    dailyAdjustment = MAX_DAILY_SURPLUS;
    capped = true;
  }

  let dailyCalories = tdee + dailyAdjustment;
  if (dailyCalories < MIN_DAILY_CALORIES) {
    dailyCalories = MIN_DAILY_CALORIES;
    capped = true;
  }

  const rounded = Math.round(dailyCalories);

  return {
    dailyCalories: rounded,
    dailyAdjustment: rounded - Math.round(tdee),
    requestedDailyAdjustment: requestedAdjustment,
    totalEnergyDelta,
    kgToChange: Math.abs(kgDelta),
    direction: kgDelta < 0 ? "lose" : "gain",
    capped,
  };
}

export type CalorieAdjustmentLevel = "maintain" | "healthy" | "steep" | "aggressive" | "unsustainable";

export type CalorieAdjustmentAssessment = {
  level: CalorieAdjustmentLevel;
  label: string;
  description: string;
  /** Absolute kcal/day below (deficit) or above (surplus) maintenance. */
  dailyKcal: number;
  bmrPercent: number;
  isDeficit: boolean;
};

/** Rate a daily deficit or surplus against BMR (10% healthy, 20% steep, 30%+ unsustainable). */
export function assessCalorieAdjustment(
  bmr: number,
  dailyAdjustment: number,
): CalorieAdjustmentAssessment {
  if (!(bmr > 0)) {
    throw new Error("BMR must be positive.");
  }

  if (Math.abs(dailyAdjustment) < 1) {
    return {
      level: "maintain",
      label: "Maintenance",
      description: "No daily deficit or surplus — eat at maintenance to hold weight.",
      dailyKcal: 0,
      bmrPercent: 0,
      isDeficit: false,
    };
  }

  const isDeficit = dailyAdjustment < 0;
  const dailyKcal = Math.round(Math.abs(dailyAdjustment));
  const bmrPercent = (dailyKcal / bmr) * 100;

  if (bmrPercent <= 10) {
    return {
      level: "healthy",
      label: isDeficit ? "Healthy deficit" : "Healthy surplus",
      description: isDeficit
        ? "Within 10% of BMR — a sustainable deficit for most people."
        : "Within 10% of BMR — a steady rate of gain.",
      dailyKcal,
      bmrPercent,
      isDeficit,
    };
  }

  if (bmrPercent <= 20) {
    return {
      level: "steep",
      label: isDeficit ? "Steep deficit" : "Steep surplus",
      description: isDeficit
        ? "About 10–20% of BMR — ambitious but achievable with consistency."
        : "About 10–20% of BMR — faster gain; watch for excess fat.",
      dailyKcal,
      bmrPercent,
      isDeficit,
    };
  }

  if (bmrPercent < 30) {
    return {
      level: "aggressive",
      label: isDeficit ? "Aggressive deficit" : "Aggressive surplus",
      description: isDeficit
        ? "Over 20% of BMR — hard to sustain; consider a longer timeline."
        : "Over 20% of BMR — likely more than you need for lean gain.",
      dailyKcal,
      bmrPercent,
      isDeficit,
    };
  }

  return {
    level: "unsustainable",
    label: isDeficit ? "Likely unsustainable" : "Likely excessive",
    description: isDeficit
      ? "30%+ of BMR — risk of muscle loss and rebound; add more weeks."
      : "30%+ of BMR — very high surplus; a slower timeline is usually better.",
    dailyKcal,
    bmrPercent,
    isDeficit,
  };
}

/** Derive macro targets from calorie goal and body weight. */
export function macrosFromCalorieGoal(
  dailyCalories: number,
  weightKg: number,
): { daily_protein_g: number; daily_carbs_g: number; daily_fat_g: number } {
  const proteinG = Math.round(Math.max(weightKg * 1.8, 50));
  const fatG = Math.round((dailyCalories * 0.27) / 9);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsG = Math.max(0, Math.round((dailyCalories - proteinKcal - fatKcal) / 4));

  return {
    daily_protein_g: proteinG,
    daily_carbs_g: carbsG,
    daily_fat_g: fatG,
  };
}

export function formatWeightGoalSummary(
  targetWeightKg: number,
  targetWeeks: number,
  direction: WeightGoalDirection,
  kgToChange: number,
): string {
  if (direction === "maintain") {
    return `Maintain ${targetWeightKg} kg`;
  }
  const verb = direction === "lose" ? "Lose" : "Gain";
  return `${verb} ${kgToChange.toFixed(1)} kg in ${targetWeeks} week${targetWeeks === 1 ? "" : "s"}`;
}
