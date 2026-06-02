export type Food = {
  id: string;
  barcode?: string | null;
  name_no: string | null;
  name_en: string | null;
  source: string;
  locale: string;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

export type FoodInsert = Food & {
  raw_nutrients?: unknown;
  created_by?: string;
};

export function displayName(food: Pick<Food, "name_no" | "name_en" | "id">): string {
  return food.name_no ?? food.name_en ?? food.id;
}

export function formatMacro(value: number | null, unit = "g"): string {
  if (value == null) return "—";
  return `${Math.round(value)} ${unit}`;
}
