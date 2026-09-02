// /api/usdt.js
// Server-side proxy for the live USDT→IRT (Toman) rate. Tries zipodo.ir
// first (as originally requested), then falls back to Nobitex's public
// market-stats endpoint (a well-documented, stable Iranian exchange API)
// if zipodo doesn't respond with something usable. Avoids browser CORS
// issues either way, and normalizes the result into { irt: <number> }.

export default async function handler(req, res) {
  const attempts = [];

  // --- Source 1: zipodo.ir --------------------------------------------
  try {
    const upstream = await fetch("https://api.zipodo.ir/usdt/", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const raw = await upstream.text();
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}: ${raw.slice(0, 200)}`);
    let json;
    try { json = JSON.parse(raw); } catch { throw new Error(`non-JSON response: ${raw.slice(0, 200)}`); }
    const irt = extractRate(json);
    if (irt == null) throw new Error(`no recognizable rate field in response: ${raw.slice(0, 200)}`);
    res.status(200).json({ irt, source: "zipodo" });
    return;
  } catch (err) {
    attempts.push(`zipodo: ${String(err.message || err)}`);
  }

  // --- Source 2: Nobitex (fallback) ------------------------------------
  try {
    const upstream = await fetch("https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const raw = await upstream.text();
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}: ${raw.slice(0, 200)}`);
    const json = JSON.parse(raw);
    const rial = json?.stats?.["usdt-rls"]?.latest;
    if (!rial) throw new Error(`missing stats["usdt-rls"].latest in response: ${raw.slice(0, 200)}`);
    res.status(200).json({ irt: Math.round(Number(rial) / 10), source: "nobitex" }); // rial -> toman
    return;
  } catch (err) {
    attempts.push(`nobitex: ${String(err.message || err)}`);
  }

  // Both sources failed — report exactly why, so this is debuggable instead
  // of a silent dead end.
  res.status(502).json({ error: "All rate sources failed", detail: attempts.join(" | ") });
}

// Scans an unknown JSON shape for a plausible IRT/Toman USDT price (a
// number in the range such a price would realistically fall into) rather
// than hardcoding one exact key, since zipodo's schema isn't documented.
function extractRate(obj, depth = 0) {
  if (depth > 3 || obj == null) return null;
  if (typeof obj === "number") {
    if (obj > 1000 && obj < 5_000_000_000) return obj;
    return null;
  }
  if (typeof obj === "string" && !isNaN(Number(obj)) && obj.trim() !== "") {
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
