import type { AppRole } from "@/lib/data/profiles";

export function canManageProtocols(role: AppRole): boolean {
  return role === "admin" || role === "test_coordinator";
}

export function protocolAccessLabel(role: AppRole): string {
  if (role === "expert_reviewer") return "Expert Reviewer";
  if (role === "law_firm_viewer") return "Law-Firm Viewer";
  if (role === "tester") return "Tester";
  return role === "admin" ? "Administrator" : "Test Coordinator";
}
