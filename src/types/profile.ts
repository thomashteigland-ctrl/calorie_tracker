import type { ActivityLevel, Sex } from "../lib/energy";

export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  height_cm: number | null;
  birth_date: string | null;
  sex: Sex | null;
  activity_level: ActivityLevel;
};
