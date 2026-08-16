// /api/usdt.js
// Server-side proxy for https://api.zipodo.ir/usdt/ — avoids browser CORS
// issues and normalizes whatever shape the upstream returns into a single
// { irt: <number> } the frontend can rely on.

export default async function handler(req, res) {
  try {
    const upstream = await fetch("https://api.zipodo.ir/usdt/", {
      headers: { Accept: "application/json" },
    });
    const raw = await upstream.text();
    let json;
    try { json = JSON.parse(raw); } catch { json = null; }

    const irt = json ? extractRate(json) : null;

    if (irt == null) {
      res.status(502).json({ error: "Could not parse a rate from zipodo response", raw: raw.slice(0, 500) });
      return;
    }
    res.status(200).json({ irt, source: "zipodo", raw: json });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach zipodo API", detail: String(err) });
  }
}

// zipodo's exact field names aren't documented publicly, so scan the
// response for a plausible IRT/Toman price (a number in the range a USDT
// price would realistically fall into) rather than hardcoding one key.
function extractRate(obj, depth = 0) {
  if (depth > 3 || obj == null) return null;
  if (typeof obj === "number") {
    // Toman values for USDT are typically in the tens/hundreds of thousands
    // to a few million range; rial values would be 10x that.
    if (obj > 1000 && obj < 5_000_000_000) return obj;
    return null;
  }
  if (typeof obj === "string" && !isNaN(Number(obj))) {
    return extractRate(Number(obj), depth);
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = extractRate(item, depth + 1);
      if (found != null) return found;
    }
    return null;
  }
  if (typeof obj === "object") {
    const priorityKeys = ["irt", "toman", "price", "rate", "sell", "buy", "value", "last", "close"];
    for (const key of priorityKeys) {
      if (key in obj) {
        const found = extractRate(obj[key], depth + 1);
        if (found != null) return found;
      }
    }
    for (const key of Object.keys(obj)) {
      const found = extractRate(obj[key], depth + 1);
      if (found != null) return found;
    }
  }
  return null;
}
