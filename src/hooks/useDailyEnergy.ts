import { useEffect, useState } from "react";
import { getLatestWeight } from "../api/progress";
import {
  ageFromBirthDate,
  canComputeEnergy,
  dailyEnergy,
  type DailyEnergy,
} from "../lib/energy";
import type { Profile } from "../types/profile";

export function useDailyEnergy(
  userId: string | undefined,
  profile: Profile | null,
  refreshKey = 0,
) {
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setWeightKg(null);
      return;
    }
    let cancelled = false;

    function load() {
      if (!userId) return;
      setLoading(true);
      getLatestWeight(userId)
        .then((w) => {
          if (!cancelled) setWeightKg(w);
        })
        .catch(() => {
          if (!cancelled) setWeightKg(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, [
    userId,
    profile?.height_cm,
    profile?.birth_date,
    profile?.sex,
    profile?.activity_level,
    refreshKey,
  ]);

  let energy: DailyEnergy | null = null;
  if (
    profile &&
    canComputeEnergy(weightKg, profile.height_cm, profile.birth_date, profile.sex)
  ) {
    energy = dailyEnergy(
      weightKg!,
      profile.height_cm!,
      ageFromBirthDate(profile.birth_date!),
      profile.sex!,
      profile.activity_level,
    );
  }

  return { energy, weightKg, loading };
}
