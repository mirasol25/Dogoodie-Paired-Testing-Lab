import { describe, expect, it } from "vitest";
import {
  absolutePriceDifference,
  higherPricedTester,
  median,
  percentagePriceDifference,
} from "@/lib/calculations/price-calculations";
import { haversineDistanceFeet, haversineDistanceMeters } from "@/lib/calculations/geographic-distance";
import { timestampDifferenceSeconds } from "@/lib/calculations/date-calculations";

describe("price calculations", () => {
  it("calculates the absolute price difference", () => {
    expect(absolutePriceDifference(47.8, 64.05)).toBeCloseTo(16.25, 8);
  });

  it("calculates percentage variance against the lower quote", () => {
    expect(percentagePriceDifference(47.8, 64.05)).toBeCloseTo(33.9958, 3);
  });

  it("identifies the higher-priced tester and ties", () => {
    expect(higherPricedTester(47.8, 64.05, "Alpha", "Bravo")).toBe("Bravo");
    expect(higherPricedTester(52, 52)).toContain("equal");
  });

  it("calculates medians for odd and even sets", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("distance and time calculations", () => {
  it("calculates timestamp difference at full precision", () => {
    expect(timestampDifferenceSeconds("2026-05-14T14:14:22.400Z", "2026-05-14T14:14:25.600Z")).toBeCloseTo(3.2);
  });

  it("returns zero distance for identical coordinates", () => {
    expect(haversineDistanceMeters(40.758, -73.9855, 40.758, -73.9855)).toBe(0);
  });

  it("calculates a known approximate Manhattan coordinate distance", () => {
    expect(haversineDistanceFeet(40.758, -73.9855, 40.7580104, -73.9855)).toBeCloseTo(3.8, 1);
  });
});

