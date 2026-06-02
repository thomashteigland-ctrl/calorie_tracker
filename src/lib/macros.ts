import type { Food } from "../types/food";

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const EMPTY_TOTALS: MacroTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

/** One portion = 100 g of the food. */
export function macrosForPortions(food: Pick<Food, "calories_per_100g" | "protein_per_100g" | "carbs_per_100g" | "fat_per_100g">, portions: number): MacroTotals {
  return {
    calories: (food.calories_per_100g ?? 0) * portions,
    protein: (food.protein_per_100g ?? 0) * portions,
    carbs: (food.carbs_per_100g ?? 0) * portions,
    fat: (food.fat_per_100g ?? 0) * portions,
  };
}

export function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function progressPercent(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}
