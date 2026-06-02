import { supabase } from "../lib/supabase";
import type { ActivityLevel, Sex } from "../lib/energy";
import type { Profile } from "../types/profile";

const PROFILE_COLUMNS =
  "id, display_name, created_at, height_cm, birth_date, sex, activity_level";

const BASIC_PROFILE_COLUMNS = "id, display_name, created_at";

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("schema cache")
  );
}

function profileFromBasicRow(row: {
  id: string;
  display_name: string | null;
  created_at: string;
}): Profile {
  return {
    ...row,
    height_cm: null,
    birth_date: null,
    sex: null,
    activity_level: "moderate",
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (!error) return data as Profile | null;

  if (!isMissingColumnError(error)) throw error;

  const basic = await supabase
    .from("profiles")
    .select(BASIC_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (basic.error) throw basic.error;
  if (!basic.data) return null;
  return profileFromBasicRow(basic.data);
}

export type ProfileEnergyInput = {
  height_cm: number;
  birth_date: string;
  sex: Sex;
  activity_level: ActivityLevel;
};

export async function updateProfileEnergy(userId: string, input: ProfileEnergyInput): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      height_cm: input.height_cm,
      birth_date: input.birth_date,
      sex: input.sex,
      activity_level: input.activity_level,
    })
    .eq("id", userId);

  if (error) throw error;
}
