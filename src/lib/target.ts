import { canComputeEnergy, type DailyEnergy } from "./energy";
import type { UserGoals } from "../types/goals";
import type { Profile } from "../types/profile";

export function isTargetConfigured(
  profile: Profile | null | undefined,
  weightKg: number | null | undefined,
  goals: UserGoals | null | undefined,
): boolean {
  if (!profile || !goals) return false;
  if (!canComputeEnergy(weightKg, profile.height_cm, profile.birth_date, profile.sex)) return false;
  return (
    goals.target_weight_kg != null &&
    goals.target_weight_kg > 0 &&
    goals.target_weeks != null &&
    goals.target_weeks > 0
  );
}

export function weightGoalSummary(goals: UserGoals, currentWeightKg: number | null): string | null {
  if (
    goals.target_weight_kg == null ||
    goals.target_weeks == null ||
    !(goals.target_weight_kg > 0) ||
    !(goals.target_weeks > 0)
  ) {
    return null;
  }

  const delta = goals.target_weight_kg - (currentWeightKg ?? goals.target_weight_kg);
  if (Math.abs(delta) < 0.1) {
    return `Maintain ${goals.target_weight_kg} kg`;
  }
  const verb = delta < 0 ? "Lose" : "Gain";
  return `${verb} ${Math.abs(delta).toFixed(1)} kg in ${goals.target_weeks} weeks`;
}

export type DailyCalorieBalanceLabel = "deficit" | "surplus" | "balanced";

export type DailyCalorieProgress = {
  /** Consumed − BMR − logged activity (positive = surplus, negative = deficit). */
  kcalBalance: number | null;
  balanceLabel: DailyCalorieBalanceLabel;
  onTrack: boolean;
};

/** Whether today's energy balance matches the user's weight goal. */
export function dailyCalorieProgress(
  consumed: number,
  goal: number,
  energy: DailyEnergy | null | undefined,
  loggedActivityKcal = 0,
): DailyCalorieProgress {
  if (!energy) {
    return {
      kcalBalance: null,
      balanceLabel: "balanced",
      onTrack: consumed <= goal,
    };
  }

  const kcalBalance = consumed - energy.bmr - loggedActivityKcal;
  const maintenance = energy.tdee;

  let balanceLabel: DailyCalorieBalanceLabel;
  if (Math.abs(kcalBalance) < 5) {
    balanceLabel = "balanced";
  } else if (kcalBalance > 0) {
    balanceLabel = "surplus";
  } else {
    balanceLabel = "deficit";
  }

  let onTrack: boolean;
  if (goal < maintenance - 25) {
    onTrack = kcalBalance <= 0;
  } else if (goal > maintenance + 25) {
    onTrack = kcalBalance >= 0;
  } else {
    onTrack = Math.abs(kcalBalance) <= 150;
  }

  return { kcalBalance, balanceLabel, onTrack };
}
