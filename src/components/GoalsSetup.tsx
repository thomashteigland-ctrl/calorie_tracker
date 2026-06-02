import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { TargetSetupModal } from "./TargetSetupModal";

export function GoalsSetup() {
  const { refreshGoals, refreshProfile } = useAuth();
  const [open, setOpen] = useState(true);

  function handleSaved() {
    setOpen(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Welcome</h1>
        <p className="auth-card__lead">Set your target to calculate calorie balance and macro goals.</p>
        {!open ? (
          <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
            Set up target
          </button>
        ) : null}
      </div>
      {open ? (
        <TargetSetupModal
          dismissible={false}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            await refreshProfile();
            await refreshGoals();
            handleSaved();
          }}
        />
      ) : null}
    </div>
  );
}
