import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useDailyEnergy } from "../hooks/useDailyEnergy";
import { isTargetConfigured } from "../lib/target";
import type { Profile } from "../types/profile";
import { BottomNav } from "./BottomNav";
import { HomeScreen } from "./HomeScreen";
import { ProgressScreen } from "./ProgressScreen";
import { TargetSetupModal } from "./TargetSetupModal";

type Tab = "diary" | "progress";

export function MainShell() {
  const { signOut, user, profile, refreshProfile, refreshGoals } = useAuth();
  const [tab, setTab] = useState<Tab>("diary");
  const [targetOpen, setTargetOpen] = useState(false);
  const [energyRefreshKey, setEnergyRefreshKey] = useState(0);
  const [profileForEnergy, setProfileForEnergy] = useState<Profile | null>(null);

  const energyProfile = profileForEnergy ?? profile;
  const { energy, weightKg } = useDailyEnergy(user?.id, energyProfile, energyRefreshKey);

  useEffect(() => {
    if (!profileForEnergy || !profile) return;
    if (
      profile.height_cm === profileForEnergy.height_cm &&
      profile.birth_date === profileForEnergy.birth_date &&
      profile.sex === profileForEnergy.sex &&
      profile.activity_level === profileForEnergy.activity_level
    ) {
      setProfileForEnergy(null);
    }
  }, [profile, profileForEnergy]);
  const targetConfigured = isTargetConfigured(energyProfile, weightKg);

  function openTarget() {
    setTargetOpen(true);
  }

  async function handleTargetSaved() {
    const freshProfile = await refreshProfile();
    await refreshGoals();
    if (freshProfile) setProfileForEnergy(freshProfile);
    setEnergyRefreshKey((k) => k + 1);
  }

  return (
    <div className="app-shell">
      <header className="app-header app-header--row app-shell__header">
        <h1>Calorie Counter</h1>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <div className="app-shell__content">
        {tab === "diary" ? (
          <HomeScreen
            energy={energy}
            targetConfigured={targetConfigured}
            onOpenTarget={openTarget}
          />
        ) : (
          <ProgressScreen
            energy={energy}
            targetConfigured={targetConfigured}
            onOpenTarget={openTarget}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      {targetOpen ? (
        <TargetSetupModal
          onClose={() => setTargetOpen(false)}
          onSaved={() => void handleTargetSaved()}
        />
      ) : null}
    </div>
  );
}
