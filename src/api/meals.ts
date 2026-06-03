import { supabase } from "../lib/supabase";
import type { DiaryMeal } from "../types/meal";

/** Next meal label based on meals that already have logged food. */
export async function getNextMealNumber(userId: string, loggedDate: string): Promise<number> {
  const { data, error } = await supabase
    .from("food_logs")
    .select("meal_id")
    .eq("user_id", userId)
    .eq("logged_date", loggedDate)
    .not("meal_id", "is", null);

  if (error) throw error;

  const withFood = new Set((data ?? []).map((row) => row.meal_id as string));
  return withFood.size + 1;
}

/** Remove meal rows with no linked food logs (e.g. abandoned add sessions). */
export async function deleteEmptyMealsForDate(userId: string, loggedDate: string): Promise<void> {
  const { data: meals, error } = await supabase
    .from("diary_meals")
    .select("id")
    .eq("user_id", userId)
    .eq("logged_date", loggedDate);

  if (error) throw error;

  await Promise.all((meals ?? []).map((meal) => deleteMealIfEmpty(meal.id)));
}

/** Create a meal slot when the first food is added (Meal 1, Meal 2, …). */
export async function createMeal(
  userId: string,
  loggedDate: string,
  mealNumber?: number,
): Promise<DiaryMeal> {
  const n = mealNumber ?? (await getNextMealNumber(userId, loggedDate));

  const { data, error } = await supabase
    .from("diary_meals")
    .insert({
      user_id: userId,
      logged_date: loggedDate,
      name: `Meal ${n}`,
      sort_order: n,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DiaryMeal;
}

export async function updateMealName(mealId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Meal name cannot be empty.");

  const { error } = await supabase.from("diary_meals").update({ name: trimmed }).eq("id", mealId);

  if (error) throw error;
}

export async function deleteMeal(mealId: string): Promise<void> {
  const { error } = await supabase.from("diary_meals").delete().eq("id", mealId);

  if (error) throw error;
}

export async function deleteMealIfEmpty(mealId: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from("food_logs")
    .select("*", { count: "exact", head: true })
    .eq("meal_id", mealId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) return;

  await deleteMeal(mealId);
}
