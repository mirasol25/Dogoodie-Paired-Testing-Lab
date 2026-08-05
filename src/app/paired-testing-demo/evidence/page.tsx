import { EvidenceClient } from "@/components/paired-testing/evidence/evidence-client";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyEvidence } from "@/lib/data/evidence";
import { PageHeader } from "@/components/paired-testing/shared/page-header";

export default async function EvidencePage() {
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], "/paired-testing-demo/evidence");
  const study = await getActiveStudy();
  if (!study) return <EvidenceClient records={[]} studyCode="No study" timezone="UTC" canOpenFiles={false} />;
  if (identity.profile.role === "law_firm_viewer" && !["completed", "archived"].includes(study.status)) return <div className="space-y-6"><PageHeader eyebrow="Evidence repository" title="Evidence not released" description="Viewer access begins when the selected study is completed or archived." /></div>;
  const records = await listStudyEvidence(study.id);
  const canOpenFiles = ["admin", "test_coordinator", "expert_reviewer"].includes(identity.profile.role);
  return <EvidenceClient records={records} studyCode={study.study_code} timezone={study.display_timezone} canOpenFiles={canOpenFiles} />;
}
