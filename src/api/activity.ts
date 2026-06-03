import { supabase } from "../lib/supabase";

export async function getStepsForDate(userId: string, loggedDate: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("step_logs")
    .select("steps")
    .eq("user_id", userId)
    .eq("logged_date", loggedDate)
    .maybeSingle();

  if (error) throw error;
  return data?.steps ?? null;
}

export async function upsertStepsForDate(
  userId: string,
  loggedDate: string,
  steps: number,
): Promise<void> {
  const { error } = await supabase.from("step_logs").upsert(
    { user_id: userId, logged_date: loggedDate, steps: Math.round(steps) },
    { onConflict: "user_id,logged_date" },
  );

  if (error) throw error;
}
