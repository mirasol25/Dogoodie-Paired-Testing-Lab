import { describe, expect, it } from "vitest";
import { submissionDraftClientSchema, submissionDraftSchema } from "@/lib/validation/submission-schemas";

const sessionObservation = {
  assignmentId: "11111111-1111-4111-8111-111111111111",
  displayedFare: 487,
  quoteTimestamp: "2026-08-08T10:28:44.000Z",
  latitude: 14.414601,
  longitude: 120.922092,
  networkType: "5G",
  appVersion: "1.1",
  batteryPercentage: 13,
  notes: null,
};

describe("submission draft validation", () => {
  it("allows the observation UI to omit screenshot-confirmed and account metadata", () => {
    const { displayedFare, quoteTimestamp, ...clientObservation } = sessionObservation;
    void displayedFare; void quoteTimestamp;
    expect(submissionDraftClientSchema.safeParse(clientObservation).success).toBe(true);
  });

  it("requires a manually entered battery percentage from the observation UI", () => {
    const { displayedFare, quoteTimestamp, batteryPercentage, ...clientObservation } = sessionObservation;
    void displayedFare; void quoteTimestamp; void batteryPercentage;
    expect(submissionDraftClientSchema.safeParse(clientObservation).success).toBe(false);
  });

  it("requires server-sourced device and OS metadata for the stored snapshot", () => {
    expect(submissionDraftSchema.safeParse(sessionObservation).success).toBe(false);
    expect(submissionDraftSchema.safeParse({
      ...sessionObservation,
      deviceType: "iPhone 15",
      operatingSystem: "iOS",
      operatingSystemVersion: "26",
    }).success).toBe(true);
  });
});
