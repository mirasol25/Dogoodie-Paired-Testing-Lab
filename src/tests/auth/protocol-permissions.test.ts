import { describe, expect, it } from "vitest";
import { canManageProtocols, protocolAccessLabel } from "@/lib/auth/protocol-permissions";

describe("protocol role permissions", () => {
  it.each(["admin", "test_coordinator"] as const)("allows %s to manage protocols", (role) => {
    expect(canManageProtocols(role)).toBe(true);
  });

  it.each(["tester", "expert_reviewer", "law_firm_viewer"] as const)("keeps %s read-only", (role) => {
    expect(canManageProtocols(role)).toBe(false);
  });

  it("uses explicit role labels in the read-only notice", () => {
    expect(protocolAccessLabel("expert_reviewer")).toBe("Expert Reviewer");
    expect(protocolAccessLabel("law_firm_viewer")).toBe("Law-Firm Viewer");
  });
});
