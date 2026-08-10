import { notFound } from "next/navigation";
import { MatchedPairsClient } from "@/components/paired-testing/pairs/matched-pairs-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyMatchedPairs } from "@/lib/data/matched-pairs";

export default async function StudyPairsPage({ params }: PageProps<"/paired-testing-demo/studies/[studyId]/pairs">) {
  const { studyId } = await params;
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], `/studies/${studyId}/pairs`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  if (identity.profile.role === "law_firm_viewer" && !["completed", "archived"].includes(study.status)) notFound();
  const pairs = await listStudyMatchedPairs(study.id);
  return <div className="space-y-6"><PageHeader eyebrow={`${study.study_code} · Technical conformity`} title="Matched Pairs" description="Inspect persisted Tester A and Tester B submissions before protocol-based technical validation." /><MatchedPairsClient pairs={pairs} timezone={study.display_timezone} canReview={identity.profile.role === "expert_reviewer"} /></div>;
}
