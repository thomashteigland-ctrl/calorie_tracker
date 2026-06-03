import type { Food } from "./food";

export type FoodLog = {
  id: string;
  user_id: string;
  food_id: string;
  logged_date: string;
  portions: number;
  meal_id: string | null;
  created_at: string;
};

export type FoodLogMealRef = {
  id: string;
  name: string;
  sort_order: number;
};

export type FoodLogWithFood = FoodLog & {
  food: Food;
  meal?: FoodLogMealRef | null;
};
