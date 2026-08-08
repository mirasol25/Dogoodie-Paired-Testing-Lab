import { describe, expect, it } from "vitest";
import { inviteAccountSchema, setPasswordSchema } from "@/lib/validation/account-schemas";

describe("account invitation validation", () => {
  it("accepts a valid internal invitation", () => {
    expect(inviteAccountSchema.safeParse({
      email: "tester@example.test",
      displayName: "Tester Alpha",
      role: "tester",
    }).success).toBe(true);
  });

  it("rejects invalid email addresses and roles", () => {
    expect(inviteAccountSchema.safeParse({
      email: "invalid",
      displayName: "Tester Alpha",
      role: "owner",
    }).success).toBe(false);
  });
});

describe("invitation password validation", () => {
  it("requires matching passwords of at least twelve characters", () => {
    expect(setPasswordSchema.safeParse({
      password: "a-secure-password",
      confirmPassword: "a-secure-password",
      latitude: "14.5995",
      longitude: "120.9842",
      networkType: "5G",
      deviceType: "iPhone 15",
      operatingSystem: "iOS",
      operatingSystemVersion: "26",
      appVersion: "1.1",
      browserLanguage: "en-PH",
      browserTimezone: "Asia/Manila",
      screenSize: "1179x2556",
      userAgent: "test browser",
    }).success).toBe(true);
    expect(setPasswordSchema.safeParse({
      password: "short",
      confirmPassword: "different",
    }).success).toBe(false);
  });
});
