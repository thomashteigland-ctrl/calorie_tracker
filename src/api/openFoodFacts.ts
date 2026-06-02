import { foodIdFromBarcode, normalizeBarcode } from "../lib/barcode";
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
    { headers: { Accept: "application/json" } },
  );

  if (!res.ok) {
    throw new Error(`Open Food Facts lookup failed (${res.status})`);
  }

  const data = (await res.json()) as OffResponse;
  if (data.status !== 1 || !data.product) return null;
  return data.product;
}
