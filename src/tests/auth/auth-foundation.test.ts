import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_AUTHENTICATED_PATH, getSafeNextPath } from "@/lib/auth/safe-next-path";
import { createLoginRedirect, updateSession } from "@/lib/supabase/proxy";
import { loginSchema } from "@/lib/validation/auth-schemas";

describe("internal login validation", () => {
  it("requires both a valid email and password", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it("accepts internal email-and-password input", () => {
    expect(loginSchema.safeParse({
      email: "reviewer@example.test",
      password: "internal-password",
      next: "/paired-testing-demo/pairs/PAIR-008",
    }).success).toBe(true);
  });
});

describe("safe post-login destinations", () => {
  it("allows only paired-testing application paths", () => {
    expect(getSafeNextPath("/paired-testing-demo/reports?format=print"))
      .toBe("/paired-testing-demo/reports?format=print");
    expect(getSafeNextPath("/unrelated-admin"))
      .toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it("blocks external, protocol-relative, and backslash redirect attempts", () => {
    expect(getSafeNextPath("https://attacker.example/steal")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(getSafeNextPath("//attacker.example/steal")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(getSafeNextPath("/\\attacker.example/steal")).toBe(DEFAULT_AUTHENTICATED_PATH);
  });
});

describe("protected-route redirect", () => {
  it("preserves the original protected path in the login redirect", () => {
    const request = new NextRequest("https://lab.example/paired-testing-demo/pairs/PAIR-008?panel=evidence");
    const response = createLoginRedirect(request);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next"))
      .toBe("/paired-testing-demo/pairs/PAIR-008?panel=evidence");
  });

  it("redirects a protected request when authentication is not configured", async () => {
    const request = new NextRequest("https://lab.example/paired-testing-demo/dashboard");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?");
  });
});
