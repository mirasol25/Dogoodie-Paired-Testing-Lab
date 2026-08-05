import { describe, expect, it } from "vitest";
import { canManageStudyCoordinators } from "@/lib/auth/study-member-permissions";

describe("study coordinator membership permissions", () => {
  it("reserves coordinator membership management for administrators", () => {
    expect(canManageStudyCoordinators("admin")).toBe(true);
    expect(canManageStudyCoordinators("test_coordinator")).toBe(false);
    expect(canManageStudyCoordinators("expert_reviewer")).toBe(false);
  });
});
