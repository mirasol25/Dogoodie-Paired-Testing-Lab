import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/server";
import { listAccessibleStudies, type Study } from "@/lib/data/studies";
import { ACTIVE_STUDY_COOKIE } from "@/lib/study-context";

export async function getActiveStudy(preferredStudyId?: string): Promise<Study | null> {
  const [profile, accessibleStudies] = await Promise.all([getCurrentProfile(), listAccessibleStudies()]);
  // Viewers may access only finalized, report-ready studies.
  const studies = profile?.role === "law_firm_viewer"
    ? accessibleStudies.filter((study) => study.status === "completed" || study.status === "archived")
    : accessibleStudies;
  if (!studies.length) return null;
  if (preferredStudyId) return studies.find((study) => study.id === preferredStudyId) ?? null;
  const selectedId = (await cookies()).get(ACTIVE_STUDY_COOKIE)?.value;
  return studies.find((study) => study.id === selectedId) ?? studies[0];
}
