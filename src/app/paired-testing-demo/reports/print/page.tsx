import { PrintReportClient } from "@/components/paired-testing/reports/print-report-client";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyEvidence } from "@/lib/data/evidence";
import { listStudyMatchedPairs, listStudyReviews, listStudyValidationResults } from "@/lib/data/matched-pairs";
import { getActiveProtocol, listStudyProtocols } from "@/lib/data/protocols";
import { notFound } from "next/navigation";
import { getAssignmentSetupOptions, listStudyAssignments } from "@/lib/data/assignments";
import { listProviderServiceOptions } from "@/lib/data/studies";

export default async function PrintReportPage({ searchParams }: { searchParams: Promise<{ studyId?: string }> }) {
  const { studyId } = await searchParams;
  if (!studyId) notFound();
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], `/reports/${studyId}`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  if (identity.profile.role === "law_firm_viewer" && !["completed", "archived"].includes(study.status)) notFound();
  const [protocols, assignments, pairs, evidence, activity, serviceOptions, setup] = await Promise.all([listStudyProtocols(study.id), listStudyAssignments(study.id), listStudyMatchedPairs(study.id), listStudyEvidence(study.id), listActivityLogFeed(study.id, { pageSize: 100 }), listProviderServiceOptions(), getAssignmentSetupOptions(study.id, study.configuration)]);
  const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
  const validationResults = await listStudyValidationResults(pairs.map((pair) => pair.id));
  return <PrintReportClient study={study} serviceOptions={serviceOptions} route={setup.routes[0] ?? null} protocol={getActiveProtocol(protocols)} assignments={assignments} pairs={pairs} reviews={reviews} validationResults={validationResults} evidence={evidence} activityTotal={activity.total} />;
}
