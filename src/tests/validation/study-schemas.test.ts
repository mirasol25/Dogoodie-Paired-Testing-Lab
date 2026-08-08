import { describe, expect, it } from "vitest";
import { createStudySchema, createStudyWithRouteSchema } from "@/lib/validation/study-schemas";

const validStudy = {
  studyCode: "pilot-001",
  name: "Rideshare pricing pilot",
  description: "Internal paired testing pilot.",
  studyType: "within_platform_pair" as const,
  studyQuestion: "Do matched accounts receive different displayed prices?",
  isolatedVariable: "Controlled account attribute",
  targetPairCount: 20,
  defaultCurrency: "php",
  displayTimezone: "Asia/Manila",
  testingStartsAt: "2026-08-03T09:00:00+08:00",
  testingEndsAt: "2026-08-10T17:00:00+08:00",
};

function withoutStudyCode(study: typeof validStudy) {
  const { studyCode, ...rest } = study;
  void studyCode;
  return rest;
}

describe("study creation validation", () => {
  it("normalizes the study code and currency", () => {
    const result = createStudySchema.parse(validStudy);
    expect(result.studyCode).toBe("PILOT-001");
    expect(result.defaultCurrency).toBe("PHP");
  });

  it("rejects invalid study codes, currencies, and timezones", () => {
    expect(createStudySchema.safeParse({
      ...validStudy,
      studyCode: "?",
      defaultCurrency: "peso",
      displayTimezone: "Manila",
    }).success).toBe(false);
  });

  it("requires testing to end after it starts", () => {
    const result = createStudySchema.safeParse({
      ...validStudy,
      testingEndsAt: "2026-08-03T08:59:00+08:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.testingEndsAt).toBeDefined();
    }
  });

  it("allows an open-ended draft schedule", () => {
    expect(createStudySchema.safeParse({
      ...validStudy,
      testingStartsAt: null,
      testingEndsAt: null,
      targetPairCount: null,
    }).success).toBe(true);
  });
});

describe("initial route validation", () => {
  const serviceA = "00000000-0000-4000-8000-000000000001";
  const serviceB = "00000000-0000-4000-8000-000000000002";
  const pickup = {
    label: "Public pickup",
    formattedAddress: "Manila, Philippines",
    latitude: 14.5995,
    longitude: 120.9842,
    countryCode: "PH",
    regionName: "Metro Manila",
    currencyCode: "PHP",
    timezone: "Asia/Manila",
    geocodingProvider: "nominatim",
    externalPlaceId: "100",
    isPublicLocation: true as const,
  };

  it("accepts two public pins in the same currency market", () => {
    const studyWithoutCode = withoutStudyCode(validStudy);
    expect(createStudyWithRouteSchema.safeParse({
      ...studyWithoutCode,
      searchCountryCode: "PH",
      routeName: "Manila public route",
      pickup,
      destination: { ...pickup, label: "Public destination", latitude: 14.51, longitude: 121.01 },
      platformServiceIds: [serviceA, serviceA],
      testerAServiceId: serviceA,
      testerBServiceId: serviceA,
    }).success).toBe(true);
  });

  it("requires a research question and isolated variable", () => {
    const studyWithoutCode = withoutStudyCode(validStudy);
    expect(createStudyWithRouteSchema.safeParse({
      ...studyWithoutCode,
      studyQuestion: "Short",
      isolatedVariable: "",
      searchCountryCode: "PH",
      routeName: "Manila public route",
      pickup,
      destination: { ...pickup, label: "Public destination", latitude: 14.51, longitude: 121.01 },
      platformServiceIds: [serviceA, serviceB],
      testerAServiceId: serviceA,
      testerBServiceId: serviceB,
    }).success).toBe(false);
  });

  it("accepts a Canadian route with CAD and a Canadian timezone", () => {
    const canadianPickup = {
      ...pickup,
      formattedAddress: "Toronto, Ontario, Canada",
      latitude: 43.6532,
      longitude: -79.3832,
      countryCode: "CA",
      regionName: "Ontario",
      currencyCode: "CAD",
      timezone: "America/Toronto",
    };
    expect(createStudyWithRouteSchema.safeParse({
      ...withoutStudyCode(validStudy),
      searchCountryCode: "CA",
      routeName: "Toronto public route",
      pickup: canadianPickup,
      destination: { ...canadianPickup, label: "Public destination", latitude: 43.67, longitude: -79.39 },
      platformServiceIds: [serviceA, serviceA],
      testerAServiceId: serviceA,
      testerBServiceId: serviceA,
    }).success).toBe(true);
  });

  it("requires a target pair count for the complete study workflow", () => {
    const studyWithoutCode = withoutStudyCode(validStudy);
    expect(createStudyWithRouteSchema.safeParse({
      ...studyWithoutCode,
      targetPairCount: null,
      searchCountryCode: "PH",
      routeName: "Manila public route",
      pickup,
      destination: { ...pickup, label: "Public destination", latitude: 14.51, longitude: 121.01 },
      platformServiceIds: [serviceA, serviceA],
      testerAServiceId: serviceA,
      testerBServiceId: serviceA,
    }).success).toBe(false);
  });

  it("accepts an intentional iOS versus Android comparison", () => {
    expect(createStudyWithRouteSchema.safeParse({
      ...withoutStudyCode(validStudy),
      isolatedVariable: "Operating system",
      searchCountryCode: "PH",
      routeName: "OS comparison route",
      pickup,
      destination: { ...pickup, label: "Public destination", latitude: 14.51, longitude: 121.01 },
      platformServiceIds: [serviceA, serviceA],
      testerAServiceId: serviceA,
      testerBServiceId: serviceA,
      deviceComparisonDesign: "different_operating_system",
      testerAOperatingSystem: "iOS",
      testerBOperatingSystem: "Android",
    }).success).toBe(true);
  });

  it("rejects identical route pins and cross-currency routes", () => {
    expect(createStudyWithRouteSchema.safeParse({
      ...validStudy,
      searchCountryCode: "PH",
      routeName: "Invalid route",
      pickup,
      destination: { ...pickup, countryCode: "US", currencyCode: "USD" },
      platformServiceIds: [serviceA, serviceA],
      testerAServiceId: serviceA,
      testerBServiceId: serviceA,
    }).success).toBe(false);
  });
});
