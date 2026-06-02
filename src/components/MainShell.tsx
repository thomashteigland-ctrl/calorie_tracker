import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { BottomNav } from "./BottomNav";
import { HomeScreen } from "./HomeScreen";
import { ProgressScreen } from "./ProgressScreen";

type Tab = "diary" | "progress";

export function MainShell() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("diary");

  return (
    <div className="app-shell">
      <header className="app-header app-header--row app-shell__header">
        <h1>Calorie Counter</h1>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <div className="app-shell__content">
        {tab === "diary" ? <HomeScreen /> : <ProgressScreen />}
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
