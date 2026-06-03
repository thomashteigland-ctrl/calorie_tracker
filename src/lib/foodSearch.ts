import type { Food } from "../types/food";

/** Words that rarely help food matching (NO + EN). */
const STOP_WORDS = new Set([
  "og",
  "med",
  "uten",
  "for",
  "fra",
  "som",
  "en",
  "et",
  "ei",
  "den",
  "det",
  "de",
  "i",
  "på",
  "av",
  "til",
  "the",
  "a",
  "an",
  "and",
  "or",
  "with",
  "without",
  "per",
  "ca",
  "about",
  "kcal",
  "cal",
  "calories",
  "kalorier",
  "gram",
  "g",
  "kg",
  "liter",
  "litre",
  "l",
  "ml",
  "dl",
  "stk",
  "piece",
  "pieces",
  "food",
  "mat",
  "100g",
  "100",
]);

/** Common food words for splitting compounds like "kyllingfilet" → kylling + filet. Longest first. */
const FOOD_STEMS = [
  "chicken",
  "kylling",
  "breast",
  "bryst",
  "filet",
  "fillet",
  "laks",
  "salmon",
  "torsk",
  "cod",
  "makrell",
  "mackerel",
  "sild",
  "herring",
  "reker",
  "shrimp",
  "scampi",
  "biff",
  "beef",
  "svinekjott",
  "svinekjøtt",
  "pork",
  "skinke",
  "ham",
  "bacon",
  "polse",
  "pølse",
  "sausage",
  "nugget",
  "nuggets",
  "burger",
  "pizza",
  "pepperoni",
  "grandiosa",
  "leverpostei",
  "knekkebrod",
  "knekkebrød",
  "havregryn",
  "rundstykke",
  "skummet",
  "lettmelk",
  "helmelk",
  "yoghurt",
  "yogurt",
  "melk",
  "milk",
  "ost",
  "cheese",
  "smor",
  "smør",
  "butter",
  "flote",
  "fløte",
  "bread",
  "brod",
  "brød",
  "potet",
  "potato",
  "ris",
  "rice",
  "pasta",
  "tomat",
  "tomater",
  "lok",
  "løk",
  "onion",
  "egg",
  "fisk",
  "fish",
  "wrap",
  "salat",
  "salad",
  "frossen",
  "frozen",
  "fersk",
  "fresh",
].sort((a, b) => b.length - a.length);

/** Remove spaces/punctuation so "kylling, filet" matches "kyllingfilet". */
export function compactText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function searchWords(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Tokens the user actually typed (before expansion). */
export function coreSearchTokens(query: string): string[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];

  return raw
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !STOP_WORDS.has(t));
}

/** Split glued words: "kyllingfilet" → ["kylling", "filet"]. */
export function splitCompoundToken(token: string): string[] {
  const t = token.toLowerCase();
  if (t.length < 6) return [t];

  let rest = t;
  const parts: string[] = [];
  let guard = 0;

  while (rest.length >= 3 && guard++ < 12) {
    const stem = FOOD_STEMS.find((s) => s !== t && rest.startsWith(s));
    if (!stem) break;
    parts.push(stem);
    rest = rest.slice(stem.length);
  }

  if (parts.length >= 2) {
    if (rest.length >= 3) parts.push(rest);
    return parts;
  }

  return [t];
}

/** Meaningful tokens after stripping noise; expands compound single words. */
export function extractSearchTerms(query: string): string[] {
  const tokens = coreSearchTokens(query);
  const expanded: string[] = [];

  for (const token of tokens) {
    expanded.push(token);
    const parts = splitCompoundToken(token);
    if (parts.length > 1) {
      expanded.push(...parts);
      expanded.push(parts.join(" "));
    }
  }

  return [...new Set(expanded)];
}

/**
 * Query variants for full-text APIs (Elasticsearch / Search-a-licious).
 * Long natural-language queries work better when reduced to key terms.
 */
export function searchQueryVariants(query: string): string[] {
  const raw = query.trim();
  const terms = extractSearchTerms(query);
  const variants: string[] = [];

  if (raw) variants.push(raw);
  if (terms.length > 0) variants.push(terms.join(" "));

  for (const core of coreSearchTokens(query)) {
    const parts = splitCompoundToken(core);
    if (parts.length > 1) variants.push(parts.join(" "));
  }

  if (terms.length >= 2) {
    variants.push(terms.slice(0, 2).join(" "));
    const byLength = [...terms].sort((a, b) => b.length - a.length);
    variants.push(byLength.slice(0, 2).join(" "));
  }

  return [...new Set(variants.map((v) => v.trim()).filter((v) => v.length >= 2))];
}

/** DB lookup keys — always includes split parts for compounds like kyllingfilet. */
export function localLookupKeys(query: string, max = 6): string[] {
  const cores = coreSearchTokens(query);
  if (cores.length === 0) {
    const fallback = query.trim();
    return fallback.length >= 2 ? [fallback] : [];
  }

  const keys: string[] = [];
  for (const token of cores) {
    keys.push(token);
    keys.push(...splitCompoundToken(token));
  }

  return [...new Set(keys.filter((k) => k.length >= 2))].slice(0, max);
}

export function foodHaystack(food: Pick<Food, "name_no" | "name_en" | "barcode">): string {
  return `${food.name_no ?? ""} ${food.name_en ?? ""} ${food.barcode ?? ""}`.toLowerCase();
}

/** English ↔ Norwegian (and common variants) for matching user queries to Matvaretabellen names. */
const TERM_ALIASES: Record<string, string[]> = {
  chicken: ["kylling"],
  kylling: ["chicken"],
  fillet: ["filet"],
  filet: ["fillet"],
  breast: ["bryst"],
  bryst: ["breast"],
  zucchini: ["squash", "courgette"],
  squash: ["zucchini", "courgette"],
  rice: ["ris"],
  ris: ["rice"],
};

function termVariants(term: string): string[] {
  const t = term.toLowerCase();
  return [t, ...(TERM_ALIASES[t] ?? [])];
}

export function termMatchesHaystack(haystack: string, compactHaystack: string, term: string): boolean {
  for (const variant of termVariants(term)) {
    if (haystack.includes(variant)) return true;
    const compactTerm = compactText(variant);
    if (compactTerm.length >= 3 && compactHaystack.includes(compactTerm)) return true;
  }
  return false;
}


/** Relevance score — partial matches OK; supports compact + compound terms. */
export function scoreFoodMatch(
  food: Pick<Food, "name_no" | "name_en" | "barcode" | "source">,
  terms: string[],
): number {
  if (terms.length === 0) return 1;

  const haystack = foodHaystack(food);
  const compactHaystack = compactText(haystack);
  let matched = 0;
  let score = 0;

  for (const term of terms) {
    if (!termMatchesHaystack(haystack, compactHaystack, term)) continue;
    matched += 1;
    score += term.length;
    if (food.name_no?.toLowerCase().includes(term) || food.name_en?.toLowerCase().includes(term)) {
      score += 4;
    }
    if (
      compactText(food.name_no ?? "").includes(compactText(term)) ||
      compactText(food.name_en ?? "").includes(compactText(term))
    ) {
      score += 8;
    }
  }

  if (matched === 0) return 0;

  score += matched * 5;
  if (matched === terms.length) score += 8;

  if (food.source === "matvaretabellen") score += 20;

  return score;
}

export function rankFoodResults(foods: Food[], query: string, limit: number): Food[] {
  const terms = extractSearchTerms(query);
  const scoringTerms = terms.length > 0 ? terms : query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return [...foods]
    .map((food) => ({
      food,
      score: scoreFoodMatch(food, scoringTerms),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ food }) => food)
    .slice(0, limit);
}

export function mergeFoodResults(local: Food[], remote: Food[], limit: number): Food[] {
  const seen = new Set<string>();
  const merged: Food[] = [];
  for (const food of [...local, ...remote]) {
    if (seen.has(food.id)) continue;
    seen.add(food.id);
    merged.push(food);
    if (merged.length >= limit) break;
  }
  return merged;
}

export function foodSourceLabel(source: string): string | null {
  if (source === "matvaretabellen") return "Matvaretabellen";
  if (source === "openfoodfacts") return "Open Food Facts";
  return null;
}
