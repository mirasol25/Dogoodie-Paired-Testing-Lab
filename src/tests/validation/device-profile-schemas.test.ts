import { describe, expect, it } from "vitest";
import { deviceProfileSchema } from "@/lib/validation/device-profile-schemas";

describe("device profile validation", () => {
  const valid = {
    deviceType: "iPhone 15",
    operatingSystem: "iOS",
    operatingSystemVersion: "26",
  };

  it("accepts the three stable device fields", () => {
    expect(deviceProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("requires every stable device field", () => {
    expect(deviceProfileSchema.safeParse({ ...valid, deviceType: "" }).success).toBe(false);
  });

  it("trims values before saving", () => {
    const parsed = deviceProfileSchema.parse({ ...valid, deviceType: "  iPhone 15  " });
    expect(parsed.deviceType).toBe("iPhone 15");
  });
});
