import { addDays, todayLocalDate } from "../lib/dates";
import { countConsecutiveUnclosedDays, resolveStreakDisplay } from "../lib/diaryStreak";
import { macrosForPortions } from "../lib/macros";
import { supabase } from "../lib/supabase";
import { FOOD_COLUMNS } from "./foods";
import { getLoggedDates } from "./logs";
import type { DailyCalorieSummary, DiaryStreakStats } from "../types/progress";

export async function getClosedDates(userId: string, fromDate: string, toDate: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("diary_closures")
    .select("logged_date")
    .eq("user_id", userId)
    .gte("logged_date", fromDate)
    .lte("logged_date", toDate);

  if (error) throw error;
  return new Set((data ?? []).map((r) => r.logged_date as string));
}

export async function isDiaryClosed(userId: string, loggedDate: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("diary_closures")
    .select("logged_date")
    .eq("user_id", userId)
    .eq("logged_date", loggedDate)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function closeDiary(userId: string, loggedDate: string): Promise<void> {
  const { error } = await supabase.from("diary_closures").insert({
    user_id: userId,
    logged_date: loggedDate,
  });

  if (error) {
    // Already closed (stale UI or double tap)
    if (error.code === "23505") return;
    throw error;
  }
}

export async function openDiary(userId: string, loggedDate: string): Promise<void> {
  const { error } = await supabase
    .from("diary_closures")
    .delete()
    .eq("user_id", userId)
    .eq("logged_date", loggedDate);

  if (error) throw error;
}

async function caloriesConsumedByDate(
  userId: string,
  dates: string[],
): Promise<Map<string, number>> {
  if (dates.length === 0) return new Map();

  const sorted = [...dates].sort();
  const { data, error } = await supabase
    .from("food_logs")
    .select(`logged_date, portions, food:foods (${FOOD_COLUMNS})`)
    .eq("user_id", userId)
    .gte("logged_date", sorted[0])
    .lte("logged_date", sorted[sorted.length - 1]);

  if (error) throw error;

  const want = new Set(dates);
  const byDate = new Map<string, number>();

  for (const row of data ?? []) {
    if (!want.has(row.logged_date)) continue;
    const food = Array.isArray(row.food) ? row.food[0] : row.food;
    if (!food) continue;
    const kcal = macrosForPortions(food, row.portions).calories;
    byDate.set(row.logged_date, (byDate.get(row.logged_date) ?? 0) + kcal);
  }

  return byDate;
}

/** Consecutive closed days (today counts if closed; else streak from yesterday). */
export async function getDiaryStreakStats(
  userId: string,
  dailyCalorieGoal: number,
): Promise<DiaryStreakStats> {
  const today = todayLocalDate();
  const lookbackStart = addDays(today, -90);
  const closedSet = await getClosedDates(userId, lookbackStart, today);

  const streakDates: string[] = [];
  let cursor = closedSet.has(today) ? today : addDays(today, -1);

  if (cursor < lookbackStart) {
    return emptyStreak(today, closedSet, lookbackStart);
  }

  while (cursor >= lookbackStart && closedSet.has(cursor)) {
    streakDates.push(cursor);
    cursor = addDays(cursor, -1);
  }

  streakDates.reverse();

  const consumedMap = await caloriesConsumedByDate(userId, streakDates);
  const streakDays: DailyCalorieSummary[] = streakDates.map((iso) => {
    const consumed = consumedMap.get(iso) ?? 0;
    const balance = consumed - dailyCalorieGoal;
    return { logged_date: iso, consumed, goal: dailyCalorieGoal, balance };
  });

  const unclosedDates: string[] = [];
  const recentLogged = await getLoggedDates(userId, addDays(today, -21), today);
  for (const iso of recentLogged) {
    if (!closedSet.has(iso)) unclosedDates.push(iso);
  }
  if (!closedSet.has(today) && !unclosedDates.includes(today)) {
    unclosedDates.push(today);
  }
  unclosedDates.sort();

  const consecutiveUnclosed = countConsecutiveUnclosedDays(today, closedSet, lookbackStart);
  return resolveStreakDisplay(today, streakDates, streakDays, unclosedDates, consecutiveUnclosed);
}

function emptyStreak(today: string, closedSet: Set<string>, lookbackStart: string): DiaryStreakStats {
  const unclosedDates = closedSet.has(today) ? [] : [today];
  const consecutiveUnclosed = countConsecutiveUnclosedDays(today, closedSet, lookbackStart);
  return resolveStreakDisplay(today, [], [], unclosedDates, consecutiveUnclosed);
}
