import { supabase } from "../lib/supabase";
import type { WeightLog } from "../types/progress";

export async function getLatestWeight(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("logged_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.weight_kg ?? null;
}

export async function getWeightLogs(userId: string, limit = 90): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WeightLog[];
}

export async function upsertWeightLog(userId: string, loggedDate: string, weightKg: number): Promise<void> {
  const { error } = await supabase.from("weight_logs").upsert(
    { user_id: userId, logged_date: loggedDate, weight_kg: weightKg },
    { onConflict: "user_id,logged_date" },
  );

  if (error) throw error;
}
