import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/server";
import { listAccessibleStudies, type Study } from "@/lib/data/studies";

export const ACTIVE_STUDY_COOKIE = "dogoodie_active_study";

export async function getActiveStudy(): Promise<Study | null> {
  const [profile, accessibleStudies] = await Promise.all([getCurrentProfile(), listAccessibleStudies()]);
  // Viewers may access only finalized, report-ready studies.
  const studies = profile?.role === "law_firm_viewer"
    ? accessibleStudies.filter((study) => study.status === "completed" || study.status === "archived")
    : accessibleStudies;
  if (!studies.length) return null;
  const selectedId = (await cookies()).get(ACTIVE_STUDY_COOKIE)?.value;
  return studies.find((study) => study.id === selectedId) ?? studies[0];
}
