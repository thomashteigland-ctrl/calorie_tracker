import { useCallback, useEffect, useMemo, useState } from "react";

import { getStepsForDate } from "../api/activity";

import { closeDiary, getClosedDates, isDiaryClosed } from "../api/diary";

import { getExerciseLogsForDate } from "../api/exercise";

import { getLogsForDate } from "../api/logs";

import { useAuth } from "../contexts/AuthContext";

import { addDays, todayLocalDate } from "../lib/dates";

import { activityKcalFromSteps } from "../lib/activity";

import type { DailyEnergy } from "../lib/energy";

import { groupLogsIntoMeals, UNGROUPED_MEAL_ID } from "../lib/groupMeals";

import { addTotals, EMPTY_TOTALS, macrosForPortions } from "../lib/macros";

import type { ExerciseLog } from "../types/exercise";

import type { FoodLogWithFood } from "../types/foodLog";

import type { MealWithLogs } from "../types/meal";

import { AddFoodModal } from "./AddFoodModal";

import { ConnectedAccounts } from "./ConnectedAccounts";

import { DailySummary } from "./DailySummary";

import { DiaryDateNav } from "./DiaryDateNav";

import { ExerciseLogModal } from "./ExerciseLogModal";

import { ExerciseLogRow } from "./ExerciseLogRow";

import { FoodLogDetailModal } from "./FoodLogDetailModal";

import { LogEntryRow } from "./LogEntryRow";

import { MealEditModal } from "./MealEditModal";



type Props = {

  energy: DailyEnergy | null;

  weightKg: number | null;

};



export function HomeScreen({ energy, weightKg }: Props) {

  const { user, goals } = useAuth();

  const [loggedDate, setLoggedDate] = useState(todayLocalDate);

  const [closedDates, setClosedDates] = useState<Set<string>>(new Set());

  const [isClosed, setIsClosed] = useState(false);

  const [logs, setLogs] = useState<FoodLogWithFood[]>([]);

  const [exercises, setExercises] = useState<ExerciseLog[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);

  const [addToMeal, setAddToMeal] = useState<{ id: string; name: string } | null>(null);

  const [showAddExercise, setShowAddExercise] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<FoodLogWithFood | null>(null);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseLog | null>(null);

  const [editingMeal, setEditingMeal] = useState<MealWithLogs | null>(null);

  const [closing, setClosing] = useState(false);

  const [loggedActivityKcal, setLoggedActivityKcal] = useState(0);



  const loadMeta = useCallback(async () => {

    if (!user) return;

    const today = todayLocalDate();

    const from = addDays(today, -120);

    const closed = await getClosedDates(user.id, from, today);

    setClosedDates(closed);

    const closedToday = await isDiaryClosed(user.id, loggedDate);

    setIsClosed(closedToday);

  }, [user, loggedDate]);



  const loadLogs = useCallback(async (): Promise<FoodLogWithFood[]> => {

    if (!user) return [];

    setLoading(true);

    setError(null);

    try {

      const data = await getLogsForDate(user.id, loggedDate);

      setLogs(data);

      return data;

    } catch (err) {

      setError(err instanceof Error ? err.message : "Could not load logs");

      return [];

    } finally {

      setLoading(false);

    }

  }, [user, loggedDate]);



  const loadActivity = useCallback(async () => {
    if (!user) {
      setLoggedActivityKcal(0);
      return;
    }

    try {

      const [steps, exerciseLogs] = await Promise.all([

        getStepsForDate(user.id, loggedDate),

        getExerciseLogsForDate(user.id, loggedDate),

      ]);

      const stepsKcal =

        steps != null && weightKg != null ? activityKcalFromSteps(steps, weightKg) : 0;

      const exerciseKcal = exerciseLogs.reduce((sum, e) => sum + e.active_kcal, 0);

      setLoggedActivityKcal(stepsKcal + exerciseKcal);

      setExercises(exerciseLogs);

    } catch {

      setLoggedActivityKcal(0);

    }

  }, [user, loggedDate, weightKg]);



  useEffect(() => {

    void loadMeta();

  }, [loadMeta]);



  useEffect(() => {

    void loadLogs();

  }, [loadLogs]);



  useEffect(() => {

    void loadActivity();

  }, [loadActivity]);



  const meals = useMemo(() => groupLogsIntoMeals(logs), [logs]);



  const totals = useMemo(

    () => logs.reduce((acc, log) => addTotals(acc, macrosForPortions(log.food, log.portions)), EMPTY_TOTALS),

    [logs],

  );



  const hasDiaryEntries = logs.length > 0 || exercises.length > 0;



  function handleAdded() {

    void loadLogs();

    void loadActivity();

    void loadMeta();

  }



  function handleExerciseSaved() {

    void loadActivity();

    void loadMeta();

  }



  function closeAddFood() {

    setShowAdd(false);

    setAddToMeal(null);

  }



  function openFoodFromMeal(logId: string) {

    const entry = logs.find((l) => l.id === logId) ?? null;

    setEditingMeal(null);

    setSelectedEntry(entry);

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

        loggedActivityKcal={loggedActivityKcal}

      />



      {canClose ? (

        <button

          type="button"

          className="btn btn--primary btn--block close-diary-btn"

          disabled={closing || !hasDiaryEntries}

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

        {!loading && !hasDiaryEntries ? (

          <p className="status">Nothing logged yet. Log a meal or add exercise below.</p>

        ) : null}



        <div className="meal-groups">

          {meals.map((meal) => (

            <section key={meal.id} className="meal-group">

              <div className="meal-group__header">

                <h3 className="meal-group__title">{meal.name}</h3>

                {meal.id !== UNGROUPED_MEAL_ID ? (

                  <button

                    type="button"

                    className="btn btn--ghost btn--small"

                    onClick={() => setEditingMeal(meal)}

                  >

                    Edit

                  </button>

                ) : null}

              </div>

              <ul className="log-list">

                {meal.logs.map((entry) => (

                  <LogEntryRow key={entry.id} entry={entry} onOpen={() => setSelectedEntry(entry)} />

                ))}

              </ul>

            </section>

          ))}

        </div>



        <section className="exercise-section">

          <h3 className="exercise-section__title">Activity</h3>

          {exercises.length > 0 ? (

            <ul className="log-list">

              {exercises.map((entry) => (

                <ExerciseLogRow

                  key={entry.id}

                  entry={entry}

                  onOpen={() => setSelectedExercise(entry)}

                />

              ))}

            </ul>

          ) : null}

          <button

            type="button"

            className="exercise-add-btn"

            onClick={() => setShowAddExercise(true)}

          >

            Add exercise

          </button>

        </section>

      </section>



      <button type="button" className="fab" aria-label="Log meal" onClick={() => setShowAdd(true)}>

        <span className="fab__label">Log meal</span>

        <span className="fab__icon" aria-hidden="true">

          +

        </span>

      </button>



      {showAdd || addToMeal ? (

        <AddFoodModal

          userId={user.id}

          loggedDate={loggedDate}

          existingMeal={addToMeal}

          onClose={closeAddFood}

          onAdded={handleAdded}

        />

      ) : null}



      {showAddExercise ? (

        <ExerciseLogModal

          userId={user.id}

          loggedDate={loggedDate}

          onClose={() => setShowAddExercise(false)}

          onSaved={handleExerciseSaved}

        />

      ) : null}



      {selectedExercise ? (

        <ExerciseLogModal

          userId={user.id}

          loggedDate={loggedDate}

          entry={selectedExercise}

          onClose={() => setSelectedExercise(null)}

          onSaved={handleExerciseSaved}

          onDeleted={handleExerciseSaved}

        />

      ) : null}



      {editingMeal ? (

        <MealEditModal

          meal={editingMeal}

          onClose={() => setEditingMeal(null)}

          onAddFood={() => {

            if (editingMeal.id === UNGROUPED_MEAL_ID) return;

            setAddToMeal({ id: editingMeal.id, name: editingMeal.name });

            setEditingMeal(null);

          }}

          onUpdated={() => {

            void (async () => {

              const data = await loadLogs();

              void loadMeta();

              if (!editingMeal) return;

              const fresh = groupLogsIntoMeals(data).find((m) => m.id === editingMeal.id);

              if (fresh && fresh.logs.length > 0) setEditingMeal(fresh);

              else setEditingMeal(null);

            })();

          }}

          onOpenFood={openFoodFromMeal}

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


