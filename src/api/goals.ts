import { supabase } from "../lib/supabase";
import type { GoalsInput, UserGoals } from "../types/goals";

export async function getGoals(userId: string): Promise<UserGoals | null> {
  const { data, error } = await supabase.from("user_goals").select("*").eq("user_id", userId).maybeSingle();

  if (error) throw error;
  return data as UserGoals | null;
}

export async function upsertGoals(userId: string, goals: GoalsInput): Promise<UserGoals> {
  const { data, error } = await supabase
    .from("user_goals")
    .upsert(
      {
        user_id: userId,
        ...goals,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as UserGoals;
}
