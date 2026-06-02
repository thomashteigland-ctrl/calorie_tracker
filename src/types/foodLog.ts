import type { Food } from "./food";

export type FoodLog = {
  id: string;
  user_id: string;
  food_id: string;
  logged_date: string;
  portions: number;
  created_at: string;
};

export type FoodLogWithFood = FoodLog & {
  food: Food;
};
