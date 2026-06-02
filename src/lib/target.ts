import { canComputeEnergy } from "./energy";
import type { Profile } from "../types/profile";

export function isTargetConfigured(
  profile: Profile | null | undefined,
  weightKg: number | null | undefined,
): boolean {
  if (!profile) return false;
  return canComputeEnergy(weightKg, profile.height_cm, profile.birth_date, profile.sex);
}
