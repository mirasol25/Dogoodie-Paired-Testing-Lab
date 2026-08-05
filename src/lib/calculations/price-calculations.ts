export function absolutePriceDifference(priceA: number, priceB: number): number {
  return Math.abs(priceA - priceB);
}

export function percentagePriceDifference(priceA: number, priceB: number): number {
  const baseline = Math.min(priceA, priceB);
  return baseline === 0 ? 0 : (absolutePriceDifference(priceA, priceB) / baseline) * 100;
}

export function higherPricedTester(
  priceA: number,
  priceB: number,
  testerA = "Tester A",
  testerB = "Tester B",
): string {
  if (priceA === priceB) return "Neither — equal quotes";
  return priceA > priceB ? testerA : testerB;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

