import { useCallback, useEffect, useMemo, useState } from "react";
import { closeDiary, getClosedDates, isDiaryClosed } from "../api/diary";
import { getLogsForDate } from "../api/logs";
import { useAuth } from "../contexts/AuthContext";
import { addDays, todayLocalDate } from "../lib/dates";
import type { DailyEnergy } from "../lib/energy";
import { addTotals, EMPTY_TOTALS, macrosForPortions } from "../lib/macros";
import type { FoodLogWithFood } from "../types/foodLog";
import { AddFoodModal } from "./AddFoodModal";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { DailySummary } from "./DailySummary";
import { DiaryDateNav } from "./DiaryDateNav";
import { FoodLogDetailModal } from "./FoodLogDetailModal";
import { LogEntryRow } from "./LogEntryRow";

type Props = {
  energy: DailyEnergy | null;
  targetConfigured: boolean;
  onOpenTarget: () => void;
};

export function HomeScreen({ energy, targetConfigured, onOpenTarget }: Props) {
  const { user, goals } = useAuth();
  const [loggedDate, setLoggedDate] = useState(todayLocalDate);
  const [closedDates, setClosedDates] = useState<Set<string>>(new Set());
  const [isClosed, setIsClosed] = useState(false);
  const [logs, setLogs] = useState<FoodLogWithFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FoodLogWithFood | null>(null);
  const [closing, setClosing] = useState(false);

  const loadMeta = useCallback(async () => {
    if (!user) return;
    const today = todayLocalDate();
    const from = addDays(today, -120);
    const closed = await getClosedDates(user.id, from, today);
    setClosedDates(closed);
    const closedToday = await isDiaryClosed(user.id, loggedDate);
    setIsClosed(closedToday);
  }, [user, loggedDate]);

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
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const totals = useMemo(
    () => logs.reduce((acc, log) => addTotals(acc, macrosForPortions(log.food, log.portions)), EMPTY_TOTALS),
    [logs],
  );

  function handleAdded() {
    void loadLogs();
    void loadMeta();
  }

  async function handleCloseDiary() {
    if (!user || isClosed) return;
    setClosing(true);
    setError(null);
    try {
      await closeDiary(user.id, loggedDate);
      await loadMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close diary");
    } finally {
      setClosing(false);
    }
  }

  if (!user || !goals) return null;

  const today = todayLocalDate();
  const canClose = !isClosed && loggedDate <= today;

  return (
    <>
      <DiaryDateNav selectedDate={loggedDate} closedDates={closedDates} onSelectDate={setLoggedDate} />

      <ConnectedAccounts />
      <DailySummary
        totals={totals}
        goals={goals}
        energy={energy}
        targetConfigured={targetConfigured}
        onOpenTarget={onOpenTarget}
      />

      {canClose ? (
        <button
          type="button"
          className="btn btn--primary btn--block close-diary-btn"
          disabled={closing || logs.length === 0}
          onClick={() => void handleCloseDiary()}
        >
          {closing ? "Closing…" : "Close diary for this day"}
        </button>
      ) : isClosed ? (
        <p className="status status--success close-diary-status">Diary closed — counts toward your streak.</p>
      ) : null}

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
            <LogEntryRow key={entry.id} entry={entry} onOpen={() => setSelectedEntry(entry)} />
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

      {selectedEntry ? (
        <FoodLogDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdated={() => {
            void loadLogs();
            void loadMeta();
          }}
          onDeleted={() => {
            setLogs((prev) => prev.filter((l) => l.id !== selectedEntry.id));
            void loadMeta();
          }}
        />
      ) : null}
    </>
  );
}
