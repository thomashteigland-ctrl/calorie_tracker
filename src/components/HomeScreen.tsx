import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteFoodLog, getLoggedDates, getLogsForDate } from "../api/logs";
import { useAuth } from "../contexts/AuthContext";
import { addDays, formatDisplayDate, last28Days, todayLocalDate } from "../lib/dates";
import { addTotals, EMPTY_TOTALS, macrosForPortions } from "../lib/macros";
import type { FoodLogWithFood } from "../types/foodLog";
import { AddFoodModal } from "./AddFoodModal";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { DailySummary } from "./DailySummary";
import { LogEntryRow } from "./LogEntryRow";
import { TrackingCalendar } from "./TrackingCalendar";

export function HomeScreen() {
  const { user, goals } = useAuth();
  const [loggedDate, setLoggedDate] = useState(todayLocalDate);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<FoodLogWithFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCalendar = useCallback(async () => {
    if (!user) return;
    const range = last28Days();
    const dates = await getLoggedDates(user.id, range[0], range[range.length - 1]);
    setLoggedDates(new Set(dates));
  }, [user]);

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
    void loadCalendar();
  }, [loadCalendar]);

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
      void loadCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove entry");
    } finally {
      setDeletingId(null);
    }
  }

  function handleAdded() {
    void loadLogs();
    void loadCalendar();
  }

  if (!user || !goals) return null;

  const today = todayLocalDate();
  const canGoForward = loggedDate < today;

  return (
    <>
      <div className="diary-day-nav">
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => setLoggedDate((d) => addDays(d, -1))}
          aria-label="Previous day"
        >
          ←
        </button>
        <p className="diary-day-nav__date">{formatDisplayDate(loggedDate)}</p>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          disabled={!canGoForward}
          onClick={() => setLoggedDate((d) => addDays(d, 1))}
          aria-label="Next day"
        >
          →
        </button>
      </div>

      <ConnectedAccounts />
      <TrackingCalendar
        selectedDate={loggedDate}
        loggedDates={loggedDates}
        onSelectDate={setLoggedDate}
      />
      <DailySummary totals={totals} goals={goals} />

      <section className="log-section">
        <h2 className="log-section__title">
          {loggedDate === today ? "Logged today" : `Logged ${loggedDate}`}
        </h2>
        {error ? (
          <p className="status status--error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="status">Loading…</p> : null}
        {!loading && logs.length === 0 ? (
          <p className="status">Nothing logged. Tap + to add food.</p>
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

      <button type="button" className="fab" aria-label="Add food" onClick={() => setShowAdd(true)}>
        +
      </button>

      {showAdd ? (
        <AddFoodModal
          userId={user.id}
          loggedDate={loggedDate}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      ) : null}
    </>
  );
}
