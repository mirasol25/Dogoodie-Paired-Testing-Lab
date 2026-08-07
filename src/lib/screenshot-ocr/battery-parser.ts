export function parseBatteryPercentage(text: string): number | null {
  const match = text.match(/\b(100|[1-9]?\d)\s*%/);
  if (match) return Number(match[1]);
  const digitsOnly = text.replace(/\s/g, "");
  return /^(100|[1-9]?\d)$/.test(digitsOnly) ? Number(digitsOnly) : null;
}
