import { FOOD_COLUMNS } from "./foods";
import { supabase } from "../lib/supabase";
import type { FoodLogWithFood } from "../types/foodLog";

const LOG_WITH_FOOD = `
  id,
  user_id,
  food_id,
  logged_date,
  portions,
  created_at,
  food:foods (${FOOD_COLUMNS})
`;

export async function getLogsForDate(userId: string, loggedDate: string): Promise<FoodLogWithFood[]> {
  const { data, error } = await supabase
    .from("food_logs")
    .select(LOG_WITH_FOOD)
    .eq("user_id", userId)
    .eq("logged_date", loggedDate)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const food = Array.isArray(row.food) ? row.food[0] : row.food;
    return { ...row, food } as FoodLogWithFood;
  });
}

export async function addFoodLog(
  userId: string,
  foodId: string,
  portions: number,
  loggedDate: string,
): Promise<void> {
  const { error } = await supabase.from("food_logs").insert({
    user_id: userId,
    food_id: foodId,
    portions,
    logged_date: loggedDate,
  });

  if (error) throw error;
}

export async function deleteFoodLog(logId: string): Promise<void> {
  const { error } = await supabase.from("food_logs").delete().eq("id", logId);

  if (error) throw error;
}
