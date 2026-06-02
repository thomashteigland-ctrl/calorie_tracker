/**
 * One-time ingestion: Matvaretabellen (Norwegian Food Composition Database)
 * https://www.matvaretabellen.no/
 *
 * Run: npm run ingest:matvaretabellen
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY in .env
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const API_EN = "https://www.matvaretabellen.no/api/en/foods.json";
const API_NB = "https://www.matvaretabellen.no/api/nb/foods.json";
const SOURCE = "matvaretabellen";
const LOCALE = "no";
const BATCH_SIZE = 200;
const DB_SCHEMA = process.env.SUPABASE_SCHEMA ?? "calories";

/** Nutrient IDs in `constituents[]` (verified against live API — Enerc is not used). */
const NUTRIENT = {
  protein: "Protein",
  carbs: "Karbo",
  fat: "Fett",
  energyKcal: "Enerc",
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill in Supabase credentials.`);
  }
  return value;
}

function constituentQuantity(food, nutrientId) {
  const entry = food.constituents?.find((c) => c.nutrientId === nutrientId);
  if (!entry || entry.quantity == null) return null;
  const n = Number(entry.quantity);
  return Number.isFinite(n) ? n : null;
}

/**
 * Energy per 100 g (kcal).
 * Enerc does not appear in this API (0/2121 items). Use top-level `calories.quantity` (kcal/100g).
 */
function caloriesPer100g(food) {
  const enerc = constituentQuantity(food, NUTRIENT.energyKcal);
  if (enerc != null) return enerc;
  const kcal = food.calories?.quantity;
  if (kcal == null) return null;
  const n = Number(kcal);
  return Number.isFinite(n) ? n : null;
}

function mapFoodToRow(foodEn, nameNo) {
  return {
    id: foodEn.foodId,
    name_no: nameNo ?? null,
    name_en: foodEn.foodName ?? null,
    source: SOURCE,
    locale: LOCALE,
    calories_per_100g: caloriesPer100g(foodEn),
    protein_per_100g: constituentQuantity(foodEn, NUTRIENT.protein),
    carbs_per_100g: constituentQuantity(foodEn, NUTRIENT.carbs),
    fat_per_100g: constituentQuantity(foodEn, NUTRIENT.fat),
    raw_nutrients: foodEn,
  };
}

async function fetchFoods(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.foods)) {
    throw new Error(`Unexpected JSON shape from ${url}: expected { foods: [...] }`);
  }
  return data.foods;
}

function printSampleAndVerification(foodsEn) {
  const sample = foodsEn[0];
  console.log("\n=== Sample food item (first entry, EN API) ===\n");
  console.log(JSON.stringify(sample, null, 2));

  const nutrientIds = new Set(sample.constituents?.map((c) => c.nutrientId) ?? []);
  const withEnerc = foodsEn.filter((f) =>
    f.constituents?.some((c) => c.nutrientId === NUTRIENT.energyKcal),
  ).length;

  console.log("\n=== Nutrient ID verification ===\n");
  console.log("Top-level keys:", Object.keys(sample).join(", "));
  console.log("foodId (→ id):", sample.foodId);
  console.log("foodName (→ name_en):", sample.foodName);
  console.log("calories (top-level, kcal/100g):", sample.calories);
  console.log(`constituents with nutrientId "${NUTRIENT.energyKcal}":`, nutrientIds.has(NUTRIENT.energyKcal) ? "yes" : "no");
  console.log(`Foods with "${NUTRIENT.energyKcal}" in entire dataset:`, withEnerc, "/", foodsEn.length);
  console.log(`→ Using top-level calories.quantity for calories_per_100g\n`);
  for (const [label, id] of [
    ["protein", NUTRIENT.protein],
    ["carbs", NUTRIENT.carbs],
    ["fat", NUTRIENT.fat],
  ]) {
    const c = sample.constituents?.find((x) => x.nutrientId === id);
    console.log(`${label} (${id}):`, c ?? "not found");
  }
  console.log("\nMapped row preview:\n", JSON.stringify(mapFoodToRow(sample, "(nb name loaded later)"), null, 2));
}

async function upsertBatches(supabase, rows) {
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("foods").upsert(batch, { onConflict: "id" });
    if (error) {
      throw new Error(`Upsert failed at batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    }
    upserted += batch.length;
    console.log(`Upserted ${upserted}/${rows.length}`);
  }
  return upserted;
}

async function main() {
  console.log("Fetching Matvaretabellen EN + NB APIs…");
  const [foodsEn, foodsNb] = await Promise.all([fetchFoods(API_EN), fetchFoods(API_NB)]);

  const nameNoById = new Map(foodsNb.map((f) => [f.foodId, f.foodName]));

  printSampleAndVerification(foodsEn);

  const onlySample = process.argv.includes("--sample-only");
  if (onlySample) {
    console.log("\n--sample-only: skipping Supabase upsert.\n");
    return;
  }

  const rows = foodsEn.map((food) => mapFoodToRow(food, nameNoById.get(food.foodId)));
  const missingNb = rows.filter((r) => !r.name_no).length;
  if (missingNb > 0) {
    console.warn(`Warning: ${missingNb} foods missing Norwegian name in NB API`);
  }

  const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    db: { schema: DB_SCHEMA },
  });
  console.log(
    `\nUpserting ${rows.length} rows into ${DB_SCHEMA}.foods (source=${SOURCE}, locale=${LOCALE})…\n`,
  );
  const count = await upsertBatches(supabase, rows);
  console.log(`\nDone. ${count} foods upserted.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
