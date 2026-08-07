import { ReportsClient } from "@/components/paired-testing/reports/reports-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { ViewerNoStudy } from "@/components/paired-testing/shared/viewer-no-study";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyEvidence } from "@/lib/data/evidence";
import { listStudyMatchedPairs, listStudyReviews, listStudyValidationResults } from "@/lib/data/matched-pairs";
import { getActiveProtocol, listStudyProtocols } from "@/lib/data/protocols";
import { listStudyAssignments } from "@/lib/data/assignments";
import { listProviderServiceOptions } from "@/lib/data/studies";

export default async function ReportsPage() {
  const identity = await requireActiveUser("/paired-testing-demo/reports");
  const study = await getActiveStudy();
  if (!study) return identity.profile.role === "law_firm_viewer" ? <ViewerNoStudy /> : <div className="space-y-6"><PageHeader eyebrow="Study outputs" title="Reports & Evidence Package" description="Select an accessible study before generating reports." /></div>;
  if (identity.profile.role === "law_firm_viewer" && !["completed", "archived"].includes(study.status)) return <div className="space-y-6"><PageHeader eyebrow="Study outputs" title="Reports not released" description="Viewer access begins when the selected study is completed or archived. Select a report-ready study." /></div>;
  const [protocols, assignments, pairs, evidence, activity, serviceOptions] = await Promise.all([listStudyProtocols(study.id), listStudyAssignments(study.id), listStudyMatchedPairs(study.id), listStudyEvidence(study.id), listActivityLogFeed(study.id, { pageSize: 100 }), listProviderServiceOptions()]);
  const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
  const validationResults = await listStudyValidationResults(pairs.map((pair) => pair.id));
  return <ReportsClient study={study} serviceOptions={serviceOptions} protocol={getActiveProtocol(protocols)} assignments={assignments} pairs={pairs} reviews={reviews} validationResults={validationResults} evidence={evidence} activity={activity.events} activityTotal={activity.total} canExport={identity.profile.role !== "law_firm_viewer"} />;
}
