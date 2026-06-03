import { foodIdFromBarcode, normalizeBarcode } from "../lib/barcode";
import { mergeFoodResults, rankFoodResults, searchQueryVariants } from "../lib/foodSearch";
import type { Food } from "../types/food";

type OffNutriments = Record<string, number | string | undefined>;

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  product_name_nb?: string;
  product_name_no?: string;
  nutriments?: OffNutriments;
};

type OffResponse = {
  status: 0 | 1;
  status_verbose?: string;
  product?: OffProduct;
};

type OffSearchHit = OffProduct & {
  code: string;
  brands?: string[];
};

type OffSearchResponse = {
  hits?: OffSearchHit[];
  count?: number;
};

const OFF_USER_AGENT =
  "CalorieCounterApp/1.0 (https://github.com/thomashteigland-ctrl/calorie_tracker)";

function offHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": OFF_USER_AGENT,
  };
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickKcalPer100g(n: OffNutriments): number | null {
  return (
    num(n["energy-kcal_100g"]) ??
    num(n["energy-kcal_value"]) ??
    (num(n["energy_100g"]) != null ? (num(n["energy_100g"]) as number) / 4.184 : null)
  );
}

export function mapOffProductToFood(product: OffProduct, barcode: string): Omit<Food, "created_at"> & {
  barcode: string;
  raw_nutrients: unknown;
} {
  const n = product.nutriments ?? {};
  const name =
    product.product_name?.trim() ||
    product.product_name_en?.trim() ||
    product.product_name_nb?.trim() ||
    product.product_name_no?.trim() ||
    `Product ${barcode}`;

  return {
    id: foodIdFromBarcode(barcode),
    barcode,
    name_no: product.product_name_nb?.trim() || product.product_name_no?.trim() || null,
    name_en: name,
    source: "openfoodfacts",
    locale: "global",
    calories_per_100g: pickKcalPer100g(n),
    protein_per_100g: num(n.proteins_100g),
    carbs_per_100g: num(n.carbohydrates_100g),
    fat_per_100g: num(n.fat_100g),
    raw_nutrients: product,
  };
}

export async function fetchOpenFoodFactsProduct(barcode: string): Promise<OffProduct | null> {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${normalized}.json`,
    { headers: offHeaders() },
  );

  if (!res.ok) {
    throw new Error(`Open Food Facts lookup failed (${res.status})`);
  }

  const data = (await res.json()) as OffResponse;
  if (data.status !== 1 || !data.product) return null;
  return data.product;
}

async function runOffSearch(query: string, limit: number, country?: string): Promise<Food[]> {
  const params = new URLSearchParams({ q: query, page_size: String(limit) });
  if (country) params.set("countries_tags_en", country);

  const res = await fetch(`/api/off-search?${params}`, {
    headers: offHeaders(),
  });
  if (!res.ok) return [];

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return [];

  const data = (await res.json()) as OffSearchResponse;
  if (!Array.isArray(data.hits)) return [];

  return data.hits
    .map((hit) => {
      const barcode = normalizeBarcode(hit.code);
      if (!barcode) return null;
      return mapOffProductToFood(hit, barcode);
    })
    .filter((f): f is NonNullable<typeof f> => f != null);
}

/**
 * Full-text search via Open Food Facts Search-a-licious (Elasticsearch).
 * Tries several query variants so long / natural-language input still matches.
 */
export async function searchOpenFoodFactsProducts(
  query: string,
  limit = 20,
  country = "Norway",
): Promise<Food[]> {
  const q = query.trim();
  if (!q) return [];

  const variants = searchQueryVariants(q).slice(0, 4);
  const poolLimit = Math.max(limit, 24);
  const pools: Food[] = [];

  for (const variant of variants) {
    const [norway, global] = await Promise.all([
      runOffSearch(variant, poolLimit, country),
      runOffSearch(variant, poolLimit),
    ]);
    pools.push(...norway, ...global);
    if (pools.length >= poolLimit * 2) break;
  }

  const merged = mergeFoodResults(pools, [], poolLimit * 2);
  return rankFoodResults(merged, q, limit);
}
