export function absolutePriceDifference(priceA: number, priceB: number): number {
  return Math.abs(priceA - priceB);
}

export function directionalPriceDifference(priceA: number, priceB: number): number {
  return priceB - priceA;
}

export function percentagePriceDifference(priceA: number, priceB: number): number {
  return priceA === 0 ? 0 : (directionalPriceDifference(priceA, priceB) / priceA) * 100;
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

