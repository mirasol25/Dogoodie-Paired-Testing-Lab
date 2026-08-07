import { fromZonedTime } from "date-fns-tz";
import type { QuoteTimeResolution } from "./schemas";

export function parseStatusBarTime(text: string): string | null {
  const match = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*([AaPp][Mm]))?\b/);
  return match ? `${match[1]}:${match[2]}${match[3] ? ` ${match[3].toUpperCase()}` : ""}` : null;
}

export function resolveQuoteTime(rawTimeText: string | null, evidenceUploadedAt: string, timezone: string, warningMinutes = 30): QuoteTimeResolution {
  const parsed = rawTimeText ? rawTimeText.match(/^([01]?\d|2[0-3]):([0-5]\d)(?:\s*([AaPp][Mm]))?$/) : null;
  if (!parsed) return { rawTimeText, resolvedTimestamp: null, method: "unresolved", differenceFromUploadMinutes: null };
  const upload = new Date(evidenceUploadedAt);
  if (Number.isNaN(upload.getTime())) return { rawTimeText, resolvedTimestamp: null, method: "unresolved", differenceFromUploadMinutes: null };
  const days = [-1, 0, 1];
  const candidates = days.flatMap((offset) => {
    const day = new Date(upload.getTime() + offset * 86_400_000);
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(day);
    const dateValue = (type: string) => dateParts.find((part) => part.type === type)?.value ?? "";
    const hourSource = Number(parsed[1]);
    const hours = parsed[3] ? [parsed[3].toLowerCase() === "pm" ? (hourSource % 12) + 12 : hourSource % 12] : [hourSource, (hourSource + 12) % 24];
    return hours.map((hour) => fromZonedTime(`${dateValue("year")}-${dateValue("month")}-${dateValue("day")}T${String(hour).padStart(2, "0")}:${parsed[2]}:00`, timezone));
  });
  const nearest = candidates.map((candidate) => ({ candidate, difference: Math.abs(candidate.getTime() - upload.getTime()) / 60_000 })).sort((a, b) => a.difference - b.difference)[0];
  if (!nearest || nearest.difference > warningMinutes) return { rawTimeText, resolvedTimestamp: null, method: "unresolved", differenceFromUploadMinutes: nearest ? Math.round(nearest.difference) : null };
  return { rawTimeText, resolvedTimestamp: nearest.candidate.toISOString(), method: parsed[3] || Number(parsed[1]) > 12 ? "24-hour-status-bar" : "upload-time-proximity", differenceFromUploadMinutes: Math.round(nearest.difference) };
}
