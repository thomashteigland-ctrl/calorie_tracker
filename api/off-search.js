/** Proxy Open Food Facts Search-a-licious (browser cannot call it directly — no CORS). */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.status(400).json({ error: "Missing q parameter" });
    return;
  }

  const params = new URLSearchParams({
    q,
    page_size: String(req.query.page_size ?? "24"),
  });

  if (typeof req.query.countries_tags_en === "string" && req.query.countries_tags_en) {
    params.set("countries_tags_en", req.query.countries_tags_en);
  }

  try {
    const upstream = await fetch(`https://search.openfoodfacts.org/search?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "CalorieCounterApp/1.0 (https://github.com/thomashteigland-ctrl/calorie_tracker)",
      },
    });

    const body = await upstream.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: "Search upstream unavailable" });
  }
}
