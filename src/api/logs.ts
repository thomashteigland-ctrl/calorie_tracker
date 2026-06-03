import { FOOD_COLUMNS } from "./foods";
import { addDays, todayLocalDate } from "../lib/dates";
import { macrosForPortions } from "../lib/macros";
import { supabase } from "../lib/supabase";
import type { FoodLogWithFood } from "../types/foodLog";
import type { RecentFood } from "../types/recentFood";
import type { CumulativeProgress, DailyCalorieSummary } from "../types/progress";

const LOG_WITH_FOOD = `
  id,
  user_id,
  food_id,
  logged_date,
  portions,
  meal_id,
  created_at,
  food:foods (${FOOD_COLUMNS}),
  meal:diary_meals (id, name, sort_order)
`;

function normalizeLogRow(row: Record<string, unknown>): FoodLogWithFood {
  const food = Array.isArray(row.food) ? row.food[0] : row.food;
  const meal = Array.isArray(row.meal) ? row.meal[0] : row.meal;
  return { ...row, food, meal: meal ?? null } as FoodLogWithFood;
}

export async function getLogsForDate(userId: string, loggedDate: string): Promise<FoodLogWithFood[]> {
  const { data, error } = await supabase
    .from("food_logs")
    .select(LOG_WITH_FOOD)
    .eq("user_id", userId)
    .eq("logged_date", loggedDate)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => normalizeLogRow(row as Record<string, unknown>));
}

export async function addFoodLog(
  userId: string,
  foodId: string,
  portions: number,
  loggedDate: string,
  mealId: string,
): Promise<void> {
  const { error } = await supabase.from("food_logs").insert({
    user_id: userId,
    food_id: foodId,
    portions,
    logged_date: loggedDate,
    meal_id: mealId,
  });

  if (error) throw error;
}

export async function deleteFoodLog(logId: string): Promise<void> {
  const { error } = await supabase.from("food_logs").delete().eq("id", logId);

  if (error) throw error;
}

export async function updateFoodLogPortions(logId: string, portions: number): Promise<void> {
  const { error } = await supabase.from("food_logs").update({ portions }).eq("id", logId);

  if (error) throw error;
}

export async function getLoggedDates(userId: string, fromDate: string, toDate: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("food_logs")
    .select("logged_date")
    .eq("user_id", userId)
    .gte("logged_date", fromDate)
    .lte("logged_date", toDate);

  if (error) throw error;
  const set = new Set((data ?? []).map((r) => r.logged_date as string));
  return [...set];
}

/** Distinct foods ordered by most recently logged. */
export async function getRecentFoods(userId: string, limit = 15): Promise<RecentFood[]> {
  const { data, error } = await supabase
    .from("food_logs")
    .select(LOG_WITH_FOOD)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw error;

  const seen = new Set<string>();
  const recent: RecentFood[] = [];

  for (const row of data ?? []) {
    const log = normalizeLogRow(row as Record<string, unknown>);
    if (!log.food || seen.has(log.food_id)) continue;
    seen.add(log.food_id);
    recent.push({
      ...(log.food as RecentFood),
      last_portions: log.portions,
      last_logged_at: log.created_at,
    });
    if (recent.length >= limit) break;
  }

  return recent;
}

export async function getCumulativeCalorieProgress(
  userId: string,
  dailyCalorieGoal: number,
  dayCount = 30,
): Promise<CumulativeProgress> {
  const endIso = todayLocalDate();
  const startIso = addDays(endIso, -(dayCount - 1));

  const { data, error } = await supabase
    .from("food_logs")
    .select(LOG_WITH_FOOD)
    .eq("user_id", userId)
    .gte("logged_date", startIso)
    .lte("logged_date", endIso);

  if (error) throw error;

  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    const log = normalizeLogRow(row as Record<string, unknown>);
    if (!log.food) continue;
    const kcal = macrosForPortions(log.food, log.portions).calories;
    byDate.set(log.logged_date, (byDate.get(log.logged_date) ?? 0) + kcal);
  }

  const days: DailyCalorieSummary[] = [];
  let totalBalance = 0;
  for (let i = 0; i < dayCount; i++) {
    const iso = addDays(startIso, i);
    const consumed = byDate.get(iso) ?? 0;
    const balance = consumed - dailyCalorieGoal;
    totalBalance += balance;
    days.push({ logged_date: iso, consumed, goal: dailyCalorieGoal, balance });
  }

  return { days, totalBalance };
}
