import type { ScreenshotOCRResult } from "./schemas";

export function parseSelectedFare(text: string): ScreenshotOCRResult["fare"] {
  const normalized = text.replace(/,/g, "");
  // OCR commonly recognizes the Philippine peso sign as a plain `P`.
  // Prefer a currency-marked amount so seat counts/ETAs never win.
  const candidates = [...normalized.matchAll(/(?:₱|\$|€|£|\bPHP\b|\bUSD\b|\bP)\s*(\d{1,6}(?:\.\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:₱|\$|€|£|\bPHP\b|\bUSD\b|\bP)?\s*(\d{1,6}(?:\.\d{1,2})?))?/gi)];
  for (const candidate of candidates) {
    const after = normalized.slice((candidate.index ?? 0) + candidate[0].length, (candidate.index ?? 0) + candidate[0].length + 12);
    if (/^\s*(?:min|mins|minute|minutes)\b/i.test(after)) continue;
    const min = Number(candidate[1]);
    const max = candidate[2] ? Number(candidate[2]) : null;
    if (!Number.isFinite(min) || min < 1 || min > 100000 || (max !== null && (max < min || max > 100000))) continue;
    return { min, max };
  }
  return null;
}
