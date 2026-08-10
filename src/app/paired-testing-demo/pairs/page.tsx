import { redirect } from "next/navigation";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { ViewerNoStudy } from "@/components/paired-testing/shared/viewer-no-study";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";

export default async function PairsRedirectPage() {
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], "/pairs");
  const study = await getActiveStudy();
  if (!study) return identity.profile.role === "law_firm_viewer" ? <ViewerNoStudy /> : <div className="space-y-6"><PageHeader eyebrow="Technical conformity" title="Matched Pairs" description="Select a study before reviewing paired submissions." /></div>;
  redirect(`/studies/${study.id}/pairs`);
}
