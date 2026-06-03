export type UserGoals = {
  user_id: string;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  target_weight_kg: number | null;
  target_weeks: number | null;
  updated_at: string;
};

export type GoalsInput = {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  target_weight_kg: number;
  target_weeks: number;
};

export const DEFAULT_GOALS: GoalsInput = {
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 65,
  target_weight_kg: 70,
  target_weeks: 12,
};
