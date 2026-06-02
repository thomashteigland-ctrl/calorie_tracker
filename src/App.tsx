import { AuthScreen } from "./components/AuthScreen";
import { GoalsSetup } from "./components/GoalsSetup";
import { HomeScreen } from "./components/HomeScreen";
import { useAuth } from "./contexts/AuthContext";

export default function App() {
  const { user, goals, loading, goalsLoading } = useAuth();

  if (loading) {
    return (
      <div className="app app--centered">
        <p className="status">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (goalsLoading) {
    return (
      <div className="app app--centered">
        <p className="status">Loading your profile…</p>
      </div>
    );
  }

  if (!goals) {
    return <GoalsSetup />;
  }

  return <HomeScreen />;
}
