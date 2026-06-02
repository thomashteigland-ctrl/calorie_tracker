import { useCallback, useEffect, useState } from "react";
import { resolveFoodFromBarcode, searchFoods } from "../api/foods";
import { addFoodLog } from "../api/logs";
import { BarcodeScanner } from "./BarcodeScanner";
import { ManualFoodForm } from "./ManualFoodForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { macrosForPortions } from "../lib/macros";
import { displayName, type Food } from "../types/food";

type Tab = "search" | "scan" | "manual";

type Props = {
  userId: string;
  loggedDate: string;
  onClose: () => void;
  onAdded: () => void;
};

export function AddFoodModal({ userId, loggedDate, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [portions, setPortions] = useState("1");
  const [searching, setSearching] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectFood = useCallback((food: Food) => {
    setSelected(food);
    setError(null);
  }, []);

  useEffect(() => {
    if (tab !== "search" || !debouncedQuery.trim()) {
      if (tab !== "search") return;
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
  }, [debouncedQuery, tab]);

  const portionNum = Number(portions);
  const preview = selected && portionNum > 0 ? macrosForPortions(selected, portionNum) : null;

  async function lookupBarcode(barcode: string) {
    setLookupBusy(true);
    setError(null);
    try {
      const food = await resolveFoodFromBarcode(barcode, userId);
      selectFood(food);
      setTab("search");
      setQuery(displayName(food));
      setResults([food]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barcode lookup failed");
      setManualBarcode(barcode);
      setTab("manual");
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

        <div className="modal-tabs" role="tablist">
          <button type="button" role="tab" className={tab === "search" ? "modal-tabs__active" : ""} onClick={() => setTab("search")}>
            Search
          </button>
          <button type="button" role="tab" className={tab === "scan" ? "modal-tabs__active" : ""} onClick={() => setTab("scan")}>
            Scan
          </button>
          <button type="button" role="tab" className={tab === "manual" ? "modal-tabs__active" : ""} onClick={() => setTab("manual")}>
            Add manually
          </button>
        </div>

        {error ? (
          <p className="status status--error" role="alert">
            {error}
          </p>
        ) : null}

        {tab === "search" ? (
          <>
            <p className="modal__hint">Search the database, or use Scan for packaged foods.</p>
            <input
              type="search"
              className="modal__search"
              placeholder="Search foods…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {searching ? <p className="status">Searching…</p> : null}
            {!searching && debouncedQuery && results.length === 0 ? (
              <p className="status">No match — try Scan or Add manually.</p>
            ) : null}
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
                      {food.source !== "matvaretabellen" ? ` · ${food.source}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === "scan" ? (
          <div className="scan-panel">
            <BarcodeScanner disabled={lookupBusy} onBarcode={(code) => void lookupBarcode(code)} />
            <label className="portions-field">
              <span>Or type barcode digits</span>
              <div className="scan-panel__row">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 7038010055630"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={lookupBusy || !barcodeInput.trim()}
                  onClick={() => void lookupBarcode(barcodeInput)}
                >
                  {lookupBusy ? "…" : "Look up"}
                </button>
              </div>
            </label>
            {lookupBusy ? <p className="status">Looking up product…</p> : null}
          </div>
        ) : null}

        {tab === "manual" ? (
          <ManualFoodForm
            userId={userId}
            initialBarcode={manualBarcode}
            onCreated={(food) => {
              selectFood(food);
              setTab("search");
              setQuery(displayName(food));
              setResults([food]);
            }}
          />
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
              {saving ? "Adding…" : "Add to today"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
