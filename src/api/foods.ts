import { normalizeBarcode } from "../lib/barcode";
import {
  extractSearchTerms,
  localLookupKeys,
  mergeFoodResults,
  rankFoodResults,
  termMatchesHaystack,
  compactText,
  foodHaystack,
} from "../lib/foodSearch";
import { fetchOpenFoodFactsProduct, mapOffProductToFood, searchOpenFoodFactsProducts } from "./openFoodFacts";
import { supabase } from "../lib/supabase";
import { foodIdForUserProduct } from "../lib/barcode";
import type { Food, FoodInsert } from "../types/food";

/** Slim columns for search lists — raw_nutrients is huge (~7KB/row) and breaks browser search. */
export const FOOD_SEARCH_COLUMNS =
  "id, barcode, name_no, name_en, source, locale, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g";

export const FOOD_COLUMNS = `${FOOD_SEARCH_COLUMNS}, raw_nutrients`;

const LOCAL_SCAN_LIMIT = 80;

async function fetchLocalByKey(key: string): Promise<Food[]> {
  const pattern = `%${key.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const [noRes, enRes] = await Promise.all([
    supabase.from("foods").select(FOOD_SEARCH_COLUMNS).ilike("name_no", pattern).limit(LOCAL_SCAN_LIMIT),
    supabase.from("foods").select(FOOD_SEARCH_COLUMNS).ilike("name_en", pattern).limit(LOCAL_SCAN_LIMIT),
  ]);

  if (noRes.error) throw noRes.error;
  if (enRes.error) throw enRes.error;

  return mergeFoodResults(
    (noRes.data ?? []) as Food[],
    (enRes.data ?? []) as Food[],
    LOCAL_SCAN_LIMIT * 2,
  );
}

async function searchLocalFoods(query: string): Promise<Food[]> {
  const q = query.trim();
  if (!q) return [];

  const keys = localLookupKeys(q, 4);
  if (keys.length === 0) return [];

  const pool: Food[] = [];
  for (const key of keys) {
    pool.push(...(await fetchLocalByKey(key)));
  }

  return mergeFoodResults(pool, [], LOCAL_SCAN_LIMIT * keys.length);
}

function looseFoodResults(foods: Food[], query: string, limit: number): Food[] {
  const terms = extractSearchTerms(query);
  if (terms.length === 0) return foods.slice(0, limit);

  return foods
    .filter((food) => {
      const haystack = foodHaystack(food);
      const compact = compactText(haystack);
      return terms.some((t) => termMatchesHaystack(haystack, compact, t));
    })
    .slice(0, limit);
}

/** Search Matvaretabellen/local DB and Open Food Facts with ranked partial matching. */
export async function searchFoods(query: string, limit = 30): Promise<Food[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const poolLimit = Math.max(limit * 4, 80);

  const [local, off] = await Promise.all([
    searchLocalFoods(q),
    searchOpenFoodFactsProducts(q, poolLimit).catch(() => [] as Food[]),
  ]);

  const pool = mergeFoodResults(local, off, poolLimit);
  const ranked = rankFoodResults(pool, q, limit);
  if (ranked.length > 0) return ranked;

  const loose = looseFoodResults(pool, q, limit);
  if (loose.length > 0) return loose;

  return pool.slice(0, limit);
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

function foodRowFromSearch(food: Food, userId?: string): FoodInsert {
  const row: FoodInsert = {
    id: food.id,
    barcode: food.barcode ?? null,
    name_no: food.name_no,
    name_en: food.name_en,
    source: food.source,
    locale: food.locale,
    calories_per_100g: food.calories_per_100g,
    protein_per_100g: food.protein_per_100g,
    carbs_per_100g: food.carbs_per_100g,
    fat_per_100g: food.fat_per_100g,
    raw_nutrients: { cached: true },
  };
  if (userId && (food.source === "openfoodfacts" || food.source === "user")) {
    row.created_by = userId;
  }
  return row;
}

async function upsertFood(row: FoodInsert): Promise<Food> {
  const { data, error } = await supabase
    .from("foods")
    .upsert(row, { onConflict: "id" })
    .select(FOOD_SEARCH_COLUMNS)
    .maybeSingle();

  if (error?.code === "23505" && row.barcode) {
    const { data: byBarcode, error: bcErr } = await supabase
      .from("foods")
      .select(FOOD_SEARCH_COLUMNS)
      .eq("barcode", row.barcode)
      .maybeSingle();
    if (bcErr) throw bcErr;
    if (byBarcode) return byBarcode as Food;
  }

  if (error) throw error;

  if (!data) {
    const { data: refetch, error: refetchErr } = await supabase
      .from("foods")
      .select(FOOD_SEARCH_COLUMNS)
      .eq("id", row.id)
      .maybeSingle();
    if (refetchErr) throw refetchErr;
    if (!refetch) throw new Error("Could not save food for logging.");
    return refetch as Food;
  }

  return data as Food;
}

/** Ensure the food exists in `foods` before inserting a log (OFF hits + missing Matvaretabellen rows). */
export async function ensureFoodForLog(food: Food, userId: string): Promise<Food> {
  const { data: byId, error: idErr } = await supabase
    .from("foods")
    .select(FOOD_SEARCH_COLUMNS)
    .eq("id", food.id)
    .maybeSingle();

  if (idErr) throw idErr;
  if (byId) return byId as Food;

  if (food.barcode) {
    const { data: byBarcode, error: bcErr } = await supabase
      .from("foods")
      .select(FOOD_SEARCH_COLUMNS)
      .eq("barcode", food.barcode)
      .maybeSingle();
    if (bcErr) throw bcErr;
    if (byBarcode) return byBarcode as Food;
  }

  return upsertFood(foodRowFromSearch(food, userId));
}

/** @deprecated Use ensureFoodForLog */
export async function cacheFoodForLog(food: Food, userId: string): Promise<Food> {
  return ensureFoodForLog(food, userId);
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
  return upsertFood(foodRowFromSearch(mapped as Food, userId));
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
