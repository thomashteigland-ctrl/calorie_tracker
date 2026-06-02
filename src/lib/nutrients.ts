import { macrosForPortions } from "./macros";
import type { Food } from "../types/food";

export type NutrientRow = {
  name: string;
  amount: string;
};

type Constituent = {
  nutrientId?: string;
  quantity?: number;
  unit?: string;
};

function formatAmount(qty: number, unit: string): string {
  const rounded = Math.abs(qty) >= 10 ? Math.round(qty) : Math.round(qty * 10) / 10;
  return `${rounded} ${unit}`;
}

/** Main macros for this log entry (scaled by portions). */
export function macrosForLog(food: Food, portions: number) {
  return macrosForPortions(food, portions);
}

/** All nutrients for detail view: macros first, then raw source data. */
export function listNutrientsForLog(food: Food, portions: number): NutrientRow[] {
  const rows: NutrientRow[] = [];
  const m = macrosForPortions(food, portions);

  rows.push({ name: "Calories", amount: formatAmount(m.calories, "kcal") });
  rows.push({ name: "Protein", amount: formatAmount(m.protein, "g") });
  rows.push({ name: "Carbs", amount: formatAmount(m.carbs, "g") });
  rows.push({ name: "Fat", amount: formatAmount(m.fat, "g") });

  const raw = food.raw_nutrients;
  if (!raw || typeof raw !== "object") return rows;

  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.constituents)) {
    for (const c of obj.constituents as Constituent[]) {
      if (!c.nutrientId || c.quantity == null) continue;
      const id = c.nutrientId;
      if (["Protein", "Karbo", "Fett"].includes(id)) continue;
      const scaled = c.quantity * portions;
      rows.push({ name: id, amount: formatAmount(scaled, c.unit ?? "g") });
    }
  }

  if (obj.nutriments && typeof obj.nutriments === "object") {
    const n = obj.nutriments as Record<string, number | string | undefined>;
    const skip = new Set([
      "energy-kcal_100g",
      "proteins_100g",
      "carbohydrates_100g",
      "fat_100g",
    ]);
    for (const [key, val] of Object.entries(n)) {
      if (!key.endsWith("_100g") || skip.has(key) || val == null || val === "") continue;
      const num = Number(val);
      if (!Number.isFinite(num)) continue;
      const label = key.replace(/_100g$/, "").replace(/-/g, " ");
      rows.push({ name: label, amount: formatAmount(num * portions, "g") });
    }
  }

  return rows;
}
