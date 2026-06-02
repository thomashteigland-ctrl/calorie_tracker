import { useCallback, useEffect, useState } from "react";
import { resolveFoodFromBarcode, searchFoods } from "../api/foods";
import { addFoodLog, getRecentFoods } from "../api/logs";
import { BarcodeScanner } from "./BarcodeScanner";
import { ManualFoodForm } from "./ManualFoodForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { macrosForPortions } from "../lib/macros";
import { displayName, type Food } from "../types/food";
import type { RecentFood } from "../types/recentFood";

/** Static file in `public/icons/` — use as URL, do not `import` from public. */
const BARCODE_ICON_SRC = "/icons/barcode.png";

type Props = {
  userId: string;
  loggedDate: string;
  onClose: () => void;
  onAdded: () => void;
};

export function AddFoodModal({ userId, loggedDate, onClose, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<Food[]>([]);
  const [recent, setRecent] = useState<RecentFood[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [portions, setPortions] = useState("1");
  const [searching, setSearching] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectFood = useCallback((food: Food, defaultPortions?: number) => {
    setSelected(food);
    if (defaultPortions != null) setPortions(String(defaultPortions));
    setError(null);
  }, []);

  useEffect(() => {
    getRecentFoods(userId)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [userId]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      if (!debouncedQuery.trim()) setSelected(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setError(null);

    searchFoods(debouncedQuery)
      .then((foods) => {
        if (cancelled) return;
        setResults(foods);
        setSelected((prev) => (prev && foods.some((f) => f.id === prev.id) ? prev : null));
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

  const portionNum = Number(portions);
  const preview = selected && portionNum > 0 ? macrosForPortions(selected, portionNum) : null;
  const showRecent = !query.trim() && !scanOpen && !manualOpen;

  async function lookupBarcode(barcode: string) {
    setLookupBusy(true);
    setError(null);
    try {
      const food = await resolveFoodFromBarcode(barcode, userId);
      selectFood(food);
      setScanOpen(false);
      setQuery(displayName(food));
      setResults([food]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barcode lookup failed");
      setManualBarcode(barcode);
      setManualOpen(true);
      setScanOpen(false);
    } finally {
      setLookupBusy(false);
    }
  }

  async function handleAdd() {
    if (!selected || !(portionNum > 0)) return;

    setSaving(true);
    setError(null);
    try {
      await addFoodLog(userId, selected.id, portionNum, loggedDate);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add food");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--tall"
        role="dialog"
        aria-labelledby="add-food-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="add-food-title">Add food</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

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
          />
          <button
            type="button"
            className={`add-food-toolbar__icon${scanOpen ? " add-food-toolbar__icon--active" : ""}`}
            aria-label="Scan barcode"
            title="Scan barcode"
            onClick={() => {
              setScanOpen((v) => !v);
              setManualOpen(false);
            }}
          >
            <img src={BARCODE_ICON_SRC} alt="" className="add-food-toolbar__icon-img" />
          </button>
          <button
            type="button"
            className="add-food-toolbar__icon add-food-toolbar__icon--disabled"
            aria-label="Voice log (coming soon)"
            title="Voice log — coming soon"
            disabled
          >
            🎤
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
              selectFood(food);
              setManualOpen(false);
              setQuery(displayName(food));
              setResults([food]);
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
                        className={`modal-result${selected?.id === food.id ? " modal-result--selected" : ""}`}
                        onClick={() => selectFood(food, food.last_portions)}
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
                    <button
                      type="button"
                      className={`modal-result${selected?.id === food.id ? " modal-result--selected" : ""}`}
                      onClick={() => selectFood(food)}
                    >
                      <span className="modal-result__name">{displayName(food)}</span>
                      <span className="modal-result__macros">
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

        {selected ? (
          <div className="modal-add-panel">
            <p className="modal-add-panel__selected">{displayName(selected)}</p>
            <label className="portions-field">
              <span>Portions (1 = 100 g)</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={portions}
                onChange={(e) => setPortions(e.target.value)}
              />
            </label>
            {preview ? (
              <p className="modal-add-panel__preview">
                Adds {Math.round(preview.calories)} kcal · P {Math.round(preview.protein)} g · C{" "}
                {Math.round(preview.carbs)} g · F {Math.round(preview.fat)} g
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={saving || !(portionNum > 0)}
              onClick={handleAdd}
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
