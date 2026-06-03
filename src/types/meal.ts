import type { FoodLogWithFood } from "./foodLog";

export type DiaryMeal = {
  id: string;
  user_id: string;
  logged_date: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type MealWithLogs = {
  id: string;
  name: string;
  sort_order: number;
  logs: FoodLogWithFood[];
};
