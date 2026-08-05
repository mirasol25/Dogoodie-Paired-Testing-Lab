import { MatchedPairsClient } from "@/components/paired-testing/pairs/matched-pairs-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyMatchedPairs } from "@/lib/data/matched-pairs";
import { requireActiveUser } from "@/lib/auth/server";

export default async function PairsPage() {
  const identity = await requireActiveUser("/paired-testing-demo/pairs");
  const study = await getActiveStudy();
  if (!study) return <div className="space-y-6"><PageHeader eyebrow="Technical conformity" title="Matched Pairs" description="Select a study before reviewing paired submissions." /></div>;
  const pairs = await listStudyMatchedPairs(study.id);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${study.study_code} - Technical conformity`} title="Matched Pairs" description="Inspect persisted Tester A and Tester B submissions before protocol-based technical validation." />
      <MatchedPairsClient pairs={pairs} timezone={study.display_timezone} canReview={identity.profile.role === "expert_reviewer"} />
    </div>
  );
}

