import { useCallback, useEffect, useState } from "react";
import { resolveFoodFromBarcode, searchFoods } from "../api/foods";
import { getRecentFoods } from "../api/logs";
import { deleteEmptyMealsForDate, getNextMealNumber } from "../api/meals";
import { BarcodeScanner } from "./BarcodeScanner";
import { ManualFoodForm } from "./ManualFoodForm";
import { AddFoodConfirmModal } from "./AddFoodConfirmModal";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { displayName, type Food } from "../types/food";
import { foodSourceLabel } from "../lib/foodSearch";
import type { RecentFood } from "../types/recentFood";

const BARCODE_ICON_SRC = "/icons/barcode.png";

export type ExistingMeal = {
  id: string;
  name: string;
};

type Props = {
  userId: string;
  loggedDate: string;
  /** When set, new foods are added to this meal instead of starting a new one. */
  existingMeal?: ExistingMeal | null;
  onClose: () => void;
  onAdded: () => void;
};

export function AddFoodModal({ userId, loggedDate, existingMeal, onClose, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<Food[]>([]);
  const [recent, setRecent] = useState<RecentFood[]>([]);
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [pendingPortions, setPendingPortions] = useState<number | undefined>();
  const [mealId, setMealId] = useState<string | null>(null);
  const [mealNumber, setMealNumber] = useState(1);
  const [mealName, setMealName] = useState("Meal 1");
  const [sessionCount, setSessionCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [loadingMeal, setLoadingMeal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openFood = useCallback((food: Food, defaultPortions?: number) => {
    setPendingFood(food);
    setPendingPortions(defaultPortions);
    setError(null);
  }, []);

  useEffect(() => {
    if (existingMeal) {
      setMealId(existingMeal.id);
      setMealName(existingMeal.name);
      setLoadingMeal(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoadingMeal(true);
    setMealId(null);
    deleteEmptyMealsForDate(userId, loggedDate)
      .then(() => getNextMealNumber(userId, loggedDate))
      .then((n) => {
        if (cancelled) return;
        setMealNumber(n);
        setMealName(`Meal ${n}`);
        setMealId(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not start meal");
      })
      .finally(() => {
        if (!cancelled) setLoadingMeal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, loggedDate, existingMeal]);

  useEffect(() => {
    getRecentFoods(userId)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [userId]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setError(null);

    searchFoods(debouncedQuery)
      .then((foods) => {
        if (cancelled) return;
        setResults(foods);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Search failed");
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const showRecent = !query.trim() && !scanOpen && !manualOpen;

  function handleClose() {
    onClose();
  }

  async function lookupBarcode(barcode: string) {
    setLookupBusy(true);
    setError(null);
    try {
      const food = await resolveFoodFromBarcode(barcode, userId);
      setScanOpen(false);
      setQuery(displayName(food));
      setResults([food]);
      openFood(food);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barcode lookup failed");
      setManualBarcode(barcode);
      setManualOpen(true);
      setScanOpen(false);
    } finally {
      setLookupBusy(false);
    }
  }

  function handleMealCreated(id: string, name: string) {
    setMealId(id);
    setMealName(name);
  }

  function handleFoodAdded() {
    setSessionCount((c) => c + 1);
    onAdded();
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={() => void handleClose()}>
        <div
          className="modal modal--tall"
          role="dialog"
          aria-labelledby="add-food-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="modal__header">
            <div>
              <h2 id="add-food-title">Add food</h2>
              <p className="modal__subtitle">
                {loadingMeal ? "Preparing…" : existingMeal ? `Adding to ${mealName}` : mealName}
              </p>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => void handleClose()}
              aria-label="Close"
            >
              Done
            </button>
          </header>

          {sessionCount > 0 ? (
            <p className="status status--success add-food-session">
              {sessionCount} item{sessionCount === 1 ? "" : "s"} added to {mealName}. Keep adding or tap Done.
            </p>
          ) : null}

          <div className="add-food-toolbar">
            <input
              type="search"
              className="add-food-toolbar__search"
              placeholder="Search foods…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setScanOpen(false);
                setManualOpen(false);
              }}
              autoFocus
              disabled={loadingMeal}
            />
            <button
              type="button"
              className={`add-food-toolbar__icon${scanOpen ? " add-food-toolbar__icon--active" : ""}`}
              aria-label="Scan barcode"
              title="Scan barcode"
              disabled={loadingMeal}
              onClick={() => {
                setScanOpen((v) => !v);
                setManualOpen(false);
              }}
            >
              <img src={BARCODE_ICON_SRC} alt="" className="add-food-toolbar__icon-img" />
            </button>
          </div>

          {error ? (
            <p className="status status--error" role="alert">
              {error}
            </p>
          ) : null}

          {scanOpen ? (
            <div className="scan-panel">
              <BarcodeScanner disabled={lookupBusy} onBarcode={(code) => void lookupBarcode(code)} />
              {lookupBusy ? <p className="status">Looking up product…</p> : null}
            </div>
          ) : null}

          {manualOpen ? (
            <ManualFoodForm
              userId={userId}
              initialBarcode={manualBarcode}
              onCreated={(food) => {
                setManualOpen(false);
                setQuery(displayName(food));
                setResults([food]);
                openFood(food);
              }}
            />
          ) : null}

          {!scanOpen && !manualOpen ? (
            <>
              {searching ? <p className="status">Searching…</p> : null}
              {debouncedQuery && !searching && results.length === 0 ? (
                <p className="status">
                  No match.{" "}
                  <button type="button" className="link-btn" onClick={() => setManualOpen(true)}>
                    Add manually
                  </button>
                </p>
              ) : null}

              {showRecent && recent.length > 0 ? (
                <section className="add-food-history">
                  <h3 className="add-food-history__title">History</h3>
                  <ul className="modal-results">
                    {recent.map((food) => (
                      <li key={food.id}>
                        <button
                          type="button"
                          className="modal-result"
                          onClick={() => openFood(food, food.last_portions)}
                        >
                          <span className="modal-result__name">{displayName(food)}</span>
                          <span className="modal-result__macros">
                            Last: {food.last_portions}×100 g · {food.calories_per_100g ?? "—"} kcal / 100 g
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {results.length > 0 ? (
                <ul className="modal-results">
                  {results.map((food) => (
                    <li key={food.id}>
                      <button type="button" className="modal-result" onClick={() => openFood(food)}>
                        <span className="modal-result__name">{displayName(food)}</span>
                        <span className="modal-result__macros">
                          {foodSourceLabel(food.source) ? `${foodSourceLabel(food.source)} · ` : ""}
                          {food.calories_per_100g ?? "—"} kcal / 100 g
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}

          {!manualOpen ? (
            <button type="button" className="link-btn add-food-manual-link" onClick={() => setManualOpen(true)}>
              Can&apos;t find it? Add manually
            </button>
          ) : null}
        </div>
      </div>

      {pendingFood && !loadingMeal ? (
        <AddFoodConfirmModal
          food={pendingFood}
          mealName={mealName}
          userId={userId}
          loggedDate={loggedDate}
          mealId={mealId}
          mealNumber={mealNumber}
          defaultPortions={pendingPortions}
          onClose={() => {
            setPendingFood(null);
            setPendingPortions(undefined);
          }}
          onMealCreated={handleMealCreated}
          onAdded={handleFoodAdded}
        />
      ) : null}
    </>
  );
}
