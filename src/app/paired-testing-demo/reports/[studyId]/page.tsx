import { notFound } from "next/navigation";
import { ReportsClient } from "@/components/paired-testing/reports/reports-client";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyAssignments } from "@/lib/data/assignments";
import { listStudyEvidence } from "@/lib/data/evidence";
import { listStudyMatchedPairs, listStudyReviews, listStudyValidationResults } from "@/lib/data/matched-pairs";
import { getActiveProtocol, listStudyProtocols } from "@/lib/data/protocols";
import { listProviderServiceOptions } from "@/lib/data/studies";

export default async function StudyReportPage({ params }: PageProps<"/paired-testing-demo/reports/[studyId]">) {
  const { studyId } = await params;
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], `/reports/${studyId}`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  const [protocols, assignments, pairs, evidence, activity, serviceOptions] = await Promise.all([listStudyProtocols(study.id), listStudyAssignments(study.id), listStudyMatchedPairs(study.id), listStudyEvidence(study.id), listActivityLogFeed(study.id, { pageSize: 100 }), listProviderServiceOptions()]);
  const [reviews, validationResults] = await Promise.all([listStudyReviews(pairs.map((pair) => pair.id)), listStudyValidationResults(pairs.map((pair) => pair.id))]);
  return <ReportsClient study={study} serviceOptions={serviceOptions} protocol={getActiveProtocol(protocols)} assignments={assignments} pairs={pairs} reviews={reviews} validationResults={validationResults} evidence={evidence} activity={activity.events} activityTotal={activity.total} canExport={identity.profile.role !== "law_firm_viewer"} />;
}
