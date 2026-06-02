import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteFoodLog, getLogsForDate } from "../api/logs";
import { useAuth } from "../contexts/AuthContext";
import { formatDisplayDate, todayLocalDate } from "../lib/dates";
import { addTotals, EMPTY_TOTALS, macrosForPortions } from "../lib/macros";
import type { FoodLogWithFood } from "../types/foodLog";
import { AddFoodModal } from "./AddFoodModal";
import { DailySummary } from "./DailySummary";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { LogEntryRow } from "./LogEntryRow";

export function HomeScreen() {
  const { user, goals, signOut } = useAuth();
  const [loggedDate] = useState(todayLocalDate);
  const [logs, setLogs] = useState<FoodLogWithFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLogsForDate(user.id, loggedDate);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load logs");
    } finally {
      setLoading(false);
    }
  }, [user, loggedDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const totals = useMemo(
    () => logs.reduce((acc, log) => addTotals(acc, macrosForPortions(log.food, log.portions)), EMPTY_TOTALS),
    [logs],
  );

  async function handleDelete(logId: string) {
    setDeletingId(logId);
    try {
      await deleteFoodLog(logId);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove entry");
    } finally {
      setDeletingId(null);
    }
  }

  if (!user || !goals) return null;

  return (
    <div className="app">
      <header className="app-header app-header--row">
        <div>
          <h1>Calorie Counter</h1>
          <p className="app-header__tagline">{formatDisplayDate(loggedDate)}</p>
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <main className="app-main">
        <ConnectedAccounts />
        <DailySummary totals={totals} goals={goals} />

        <section className="log-section">
          <h2 className="log-section__title">Logged today</h2>
          {error ? (
            <p className="status status--error" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? <p className="status">Loading…</p> : null}
          {!loading && logs.length === 0 ? (
            <p className="status">Nothing logged yet. Tap + to add food.</p>
          ) : null}
          <ul className="log-list">
            {logs.map((entry) => (
              <LogEntryRow
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                deleting={deletingId === entry.id}
              />
            ))}
          </ul>
        </section>
      </main>

      <button
        type="button"
        className="fab"
        aria-label="Add food"
        onClick={() => setShowAdd(true)}
      >
        +
      </button>

      {showAdd ? (
        <AddFoodModal
          userId={user.id}
          loggedDate={loggedDate}
          onClose={() => setShowAdd(false)}
          onAdded={loadLogs}
        />
      ) : null}
    </div>
  );
}
