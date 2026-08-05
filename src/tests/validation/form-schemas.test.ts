import { describe, expect, it } from "vitest";
import { assignmentSchema, testerSubmissionSchema } from "@/lib/validation/form-schemas";

describe("form validation", () => {
  it("rejects identical paired testers", () => {
    const result = assignmentSchema.safeParse({
      testerAId: "TESTER-01", testerBId: "TESTER-01", scheduledDate: "2026-05-22",
      startTime: "10:00", endTime: "10:15", platform: "RideApp A",
      pickup: "Origin", destination: "Destination", rideTier: "Standard Ride",
      isolatedVariable: "Membership status",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tester quote values", () => {
    const result = testerSubmissionSchema.safeParse({
      displayedPrice: -1, currency: "USD", platform: "RideApp A",
      quoteTimestamp: "not-a-date", latitude: 120, longitude: -73,
      networkType: "5G", deviceType: "Phone", operatingSystem: "iOS",
      operatingSystemVersion: "18.4", appVersion: "7.14.2", batteryPercentage: 105,
      accountProfileCategory: "Standard", membershipStatus: "Non-member",
      rideTier: "Standard Ride", pickup: "Origin", destination: "Destination",
    });
    expect(result.success).toBe(false);
  });
});

