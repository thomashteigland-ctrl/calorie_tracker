import { supabase } from "../lib/supabase";
import type { ExerciseLog, ExerciseLogInput } from "../types/exercise";

export async function getExerciseLogsForDate(userId: string, loggedDate: string): Promise<ExerciseLog[]> {
  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_date", loggedDate)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ExerciseLog[];
}

export async function addExerciseLog(
  userId: string,
  loggedDate: string,
  input: ExerciseLogInput,
): Promise<ExerciseLog> {
  const { data, error } = await supabase
    .from("exercise_logs")
    .insert({
      user_id: userId,
      logged_date: loggedDate,
      name: input.name.trim(),
      active_kcal: input.active_kcal,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ExerciseLog;
}

export async function updateExerciseLog(id: string, input: ExerciseLogInput): Promise<void> {
  const { error } = await supabase
    .from("exercise_logs")
    .update({
      name: input.name.trim(),
      active_kcal: input.active_kcal,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteExerciseLog(id: string): Promise<void> {
  const { error } = await supabase.from("exercise_logs").delete().eq("id", id);

  if (error) throw error;
}
