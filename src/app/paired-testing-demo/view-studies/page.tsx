import { notFound } from "next/navigation";
import { ViewStudiesClient } from "@/components/paired-testing/studies/view-studies-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listAccessibleStudies } from "@/lib/data/studies";

export default async function ViewStudiesPage() {
  const identity = await requireActiveUser("/paired-testing-demo/view-studies");
  if (identity.profile.role !== "law_firm_viewer") notFound();
  const [studies, activeStudy] = await Promise.all([listAccessibleStudies(), getActiveStudy()]);
  const reportReadyStudies = studies.filter((study) => ["completed", "archived"].includes(study.status));
  const activeStudyId = reportReadyStudies.some((study) => study.id === activeStudy?.id) ? activeStudy?.id ?? null : null;
  return <div className="space-y-6"><PageHeader eyebrow="Read-only workspace" title="Report-ready Studies" description="Select a completed or archived assigned study to inspect approved outputs, evidence metadata, activity, and reports." /><ViewStudiesClient studies={reportReadyStudies} activeStudyId={activeStudyId} /></div>;
}
