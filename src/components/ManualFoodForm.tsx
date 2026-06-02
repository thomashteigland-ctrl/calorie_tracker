import { useState } from "react";
import { createManualFood, type ManualFoodInput } from "../api/foods";
import type { Food } from "../types/food";

type Props = {
  userId: string;
  initialBarcode?: string;
  onCreated: (food: Food) => void;
};

export function ManualFoodForm({ userId, initialBarcode = "", onCreated }: Props) {
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const input: ManualFoodInput = {
      name,
      calories_per_100g: Number(calories),
      protein_per_100g: Number(protein),
      carbs_per_100g: Number(carbs),
      fat_per_100g: Number(fat),
      barcode: barcode.trim() || undefined,
    };

    try {
      const food = await createManualFood(userId, input);
      onCreated(food);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save food");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="manual-food-form">
      <p className="modal__hint">Enter per 100 g from the package nutrition table.</p>

      <label>
        <span>Product name</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <span>Barcode (optional)</span>
        <input type="text" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
      </label>
      <div className="manual-food-form__grid">
        <label>
          <span>Calories (kcal)</span>
          <input type="number" min={0} step={1} required value={calories} onChange={(e) => setCalories(e.target.value)} />
        </label>
        <label>
          <span>Protein (g)</span>
          <input type="number" min={0} step={0.1} required value={protein} onChange={(e) => setProtein(e.target.value)} />
        </label>
        <label>
          <span>Carbs (g)</span>
          <input type="number" min={0} step={0.1} required value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        </label>
        <label>
          <span>Fat (g)</span>
          <input type="number" min={0} step={0.1} required value={fat} onChange={(e) => setFat(e.target.value)} />
        </label>
      </div>

      {error ? (
        <p className="status status--error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
        {loading ? "Saving…" : "Save food to database"}
      </button>
    </form>
  );
}
