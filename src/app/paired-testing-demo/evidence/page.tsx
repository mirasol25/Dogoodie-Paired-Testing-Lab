import { redirect } from "next/navigation";
import { EvidenceClient } from "@/components/paired-testing/evidence/evidence-client";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";

export default async function EvidenceRedirectPage() {
  await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], "/evidence");
  const study = await getActiveStudy();
  if (!study) return <EvidenceClient records={[]} studyCode="No study" timezone="UTC" canOpenFiles={false} />;
  redirect(`/studies/${study.id}/evidence`);
}
