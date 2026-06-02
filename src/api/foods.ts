import { normalizeBarcode } from "../lib/barcode";
import { fetchOpenFoodFactsProduct, mapOffProductToFood } from "./openFoodFacts";
import { supabase } from "../lib/supabase";
import { foodIdForUserProduct } from "../lib/barcode";
import type { Food, FoodInsert } from "../types/food";

export const FOOD_COLUMNS =
  "id, barcode, name_no, name_en, source, locale, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, raw_nutrients";

export async function searchFoods(query: string, limit = 25): Promise<Food[]> {
  const q = query.trim();
  if (!q) return [];

  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .or(`name_no.ilike.${pattern},name_en.ilike.${pattern},barcode.ilike.${pattern}`)
    .order("name_no", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Food[];
}

export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("barcode", normalized)
    .maybeSingle();

  if (error) throw error;
  return data as Food | null;
}

async function upsertFood(row: FoodInsert): Promise<Food> {
  const { data, error } = await supabase
    .from("foods")
    .upsert(row, { onConflict: "id" })
    .select(FOOD_COLUMNS)
    .single();

  if (error) throw error;
  return data as Food;
}

/** Look up barcode in our DB, then Open Food Facts; save for everyone. */
export async function resolveFoodFromBarcode(barcode: string, userId: string): Promise<Food> {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) throw new Error("Invalid barcode — use 8–14 digits.");

  const cached = await getFoodByBarcode(normalized);
  if (cached) return cached;

  const product = await fetchOpenFoodFactsProduct(normalized);
  if (!product) {
    throw new Error(
      "Product not found in Open Food Facts. Try “Add manually” with values from the package label.",
    );
  }

  const mapped = mapOffProductToFood(product, normalized);
  return upsertFood({ ...mapped, created_by: userId });
}

export type ManualFoodInput = {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  barcode?: string;
};

export async function createManualFood(userId: string, input: ManualFoodInput): Promise<Food> {
  const barcode = input.barcode ? normalizeBarcode(input.barcode) : null;
  if (barcode) {
    const existing = await getFoodByBarcode(barcode);
    if (existing) return existing;
  }

  const row: FoodInsert = {
    id: barcode ? `off:${barcode}` : foodIdForUserProduct(),
    barcode,
    name_en: input.name.trim(),
    name_no: null,
    source: "user",
    locale: "global",
    calories_per_100g: input.calories_per_100g,
    protein_per_100g: input.protein_per_100g,
    carbs_per_100g: input.carbs_per_100g,
    fat_per_100g: input.fat_per_100g,
    raw_nutrients: { manual: true, ...input },
    created_by: userId,
  };

  return upsertFood(row);
}
