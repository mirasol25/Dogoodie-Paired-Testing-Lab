import { cookies } from "next/headers";
import { listAccessibleStudies, type Study } from "@/lib/data/studies";

export const ACTIVE_STUDY_COOKIE = "dogoodie_active_study";

export async function getActiveStudy(): Promise<Study | null> {
  const studies = await listAccessibleStudies();
  if (!studies.length) return null;
  const selectedId = (await cookies()).get(ACTIVE_STUDY_COOKIE)?.value;
  return studies.find((study) => study.id === selectedId) ?? studies[0];
}
