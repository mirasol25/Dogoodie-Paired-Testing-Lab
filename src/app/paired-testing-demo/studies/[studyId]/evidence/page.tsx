import { notFound } from "next/navigation";
import { EvidenceClient } from "@/components/paired-testing/evidence/evidence-client";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyEvidence } from "@/lib/data/evidence";

export default async function StudyEvidencePage({ params }: PageProps<"/paired-testing-demo/studies/[studyId]/evidence">) {
  const { studyId } = await params;
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], `/studies/${studyId}/evidence`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  if (identity.profile.role === "law_firm_viewer" && !["completed", "archived"].includes(study.status)) notFound();
  const records = await listStudyEvidence(study.id);
  return <EvidenceClient records={records} studyCode={study.study_code} timezone={study.display_timezone} canOpenFiles={["admin", "test_coordinator", "expert_reviewer"].includes(identity.profile.role)} />;
}
