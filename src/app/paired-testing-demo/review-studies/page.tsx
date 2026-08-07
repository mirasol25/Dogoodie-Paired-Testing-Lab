import { notFound } from "next/navigation";
import { ReviewStudiesClient } from "@/components/paired-testing/studies/review-studies-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listAccessibleStudies, listReviewerStudyWorkloads } from "@/lib/data/studies";

export default async function ReviewStudiesPage() {
  const identity = await requireActiveUser("/paired-testing-demo/review-studies");
  if (identity.profile.role !== "expert_reviewer") notFound();
  const [studies, activeStudy] = await Promise.all([listAccessibleStudies(), getActiveStudy()]);
  const workloads = await listReviewerStudyWorkloads(studies.map((study) => study.id), identity.user.id);
  const workloadByStudy = new Map(workloads.map((workload) => [workload.studyId, workload]));
  const rows = studies.map((study) => ({ study, workload: workloadByStudy.get(study.id) ?? { studyId: study.id, total: 0, pending: 0, accepted: 0, acceptedWithException: 0, rejected: 0 } }));
  return <div className="space-y-6"><PageHeader eyebrow="Reviewer workspace" title="Review Studies" description="Select an assigned study and continue its matched-pair review queue." /><ReviewStudiesClient rows={rows} activeStudyId={activeStudy?.id ?? null} /></div>;
}
