import { describe, expect, it } from "vitest";
import { deviceProfileSchema } from "@/lib/validation/device-profile-schemas";

describe("device profile validation", () => {
  const valid = {
    networkType: "5G",
    deviceType: "iPhone 15",
    operatingSystem: "iOS",
    operatingSystemVersion: "26",
    appVersion: "1.1",
  };

  it("accepts all five reusable device fields", () => {
    expect(deviceProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("requires every reusable device field", () => {
    expect(deviceProfileSchema.safeParse({ ...valid, appVersion: "" }).success).toBe(false);
  });

  it("trims values before saving", () => {
    const parsed = deviceProfileSchema.parse({ ...valid, networkType: "  Wi-Fi  " });
    expect(parsed.networkType).toBe("Wi-Fi");
  });
});
