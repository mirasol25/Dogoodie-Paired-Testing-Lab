import type { AppRole } from "@/lib/data/profiles";

export function canManageStudyCoordinators(role: AppRole): boolean {
  return role === "admin";
}
