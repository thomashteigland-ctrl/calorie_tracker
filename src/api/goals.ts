import { supabase } from "../lib/supabase";
import type { GoalsInput, UserGoals } from "../types/goals";

const GOALS_COLUMNS =
  "user_id, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, target_weight_kg, target_weeks, updated_at";

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (msg.includes("could not find") && msg.includes("column")) ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

function normalizeGoalsRow(row: Record<string, unknown>): UserGoals {
  return {
    ...(row as UserGoals),
    target_weight_kg: (row.target_weight_kg as number | null | undefined) ?? null,
    target_weeks: (row.target_weeks as number | null | undefined) ?? null,
  };
}

export async function getGoals(userId: string): Promise<UserGoals | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select(GOALS_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) {
    return data ? normalizeGoalsRow(data as Record<string, unknown>) : null;
  }

  if (!isMissingColumnError(error)) throw error;

  const basic = await supabase
    .from("user_goals")
    .select("user_id, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (basic.error) throw basic.error;
  if (!basic.data) return null;

  return normalizeGoalsRow(basic.data as Record<string, unknown>);
}

export async function upsertGoals(userId: string, goals: GoalsInput): Promise<UserGoals> {
  const payload = {
    user_id: userId,
    ...goals,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_goals")
    .upsert(payload, { onConflict: "user_id" })
    .select(GOALS_COLUMNS)
    .single();

  if (!error) {
    return normalizeGoalsRow(data as Record<string, unknown>);
  }

  if (!isMissingColumnError(error)) throw error;

  const { target_weight_kg: _tw, target_weeks: _weeks, ...macros } = goals;
  const { error: basicError } = await supabase
    .from("user_goals")
    .upsert(
      {
        user_id: userId,
        ...macros,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, updated_at")
    .single();

  if (basicError) throw basicError;

  throw new Error(
    "Weight goal columns are missing. Run migration 20250610120000_weight_goal_plan.sql in the Supabase SQL editor.",
  );
}
