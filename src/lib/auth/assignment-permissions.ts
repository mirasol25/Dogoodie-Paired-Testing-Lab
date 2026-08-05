import type { AppRole } from "@/lib/data/profiles";

export function canManageAssignments(role: AppRole): boolean {
  return role === "admin" || role === "test_coordinator";
}
