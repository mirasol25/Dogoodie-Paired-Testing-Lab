import { PrintReportClient } from "@/components/paired-testing/reports/print-report-client";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyEvidence } from "@/lib/data/evidence";
import { listStudyMatchedPairs, listStudyReviews, listStudyValidationResults } from "@/lib/data/matched-pairs";
import { getActiveProtocol, listStudyProtocols } from "@/lib/data/protocols";
import { notFound } from "next/navigation";
import { listStudyAssignments } from "@/lib/data/assignments";

export default async function PrintReportPage() {
  const identity = await requireActiveUser("/paired-testing-demo/reports/print");
  const study = await getActiveStudy();
  if (!study) notFound();
  if (identity.profile.role === "law_firm_viewer" && !["completed", "archived"].includes(study.status)) notFound();
  const [protocols, assignments, pairs, evidence, activity] = await Promise.all([listStudyProtocols(study.id), listStudyAssignments(study.id), listStudyMatchedPairs(study.id), listStudyEvidence(study.id), listActivityLogFeed(study.id, { pageSize: 100 })]);
  const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
  const validationResults = await listStudyValidationResults(pairs.map((pair) => pair.id));
  return <PrintReportClient study={study} protocol={getActiveProtocol(protocols)} assignments={assignments} pairs={pairs} reviews={reviews} validationResults={validationResults} evidence={evidence} activityTotal={activity.total} />;
}
