import { DashboardClient } from "@/components/paired-testing/dashboard/dashboard-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { ViewerNoStudy } from "@/components/paired-testing/shared/viewer-no-study";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyAssignments } from "@/lib/data/assignments";
import { listStudyMatchedPairs, listStudyReviews } from "@/lib/data/matched-pairs";

export default async function DashboardPage() {
  const identity = await requireActiveUser("/paired-testing-demo/dashboard");
  const study = await getActiveStudy();
  if (!study) return identity.profile.role === "law_firm_viewer" ? <ViewerNoStudy /> : <div className="space-y-6"><PageHeader eyebrow="Study operations" title="Study Dashboard" description="Select an accessible study to view its progress." /></div>;
  if (identity.profile.role === "law_firm_viewer" && !["completed", "archived"].includes(study.status)) return <div className="space-y-6"><PageHeader eyebrow="Study outputs" title="Dashboard not released" description="Viewer access begins when the selected study is completed or archived." /></div>;
  const [assignments, pairs, activity] = await Promise.all([listStudyAssignments(study.id), listStudyMatchedPairs(study.id), listActivityLogFeed(study.id, { pageSize: 6 })]);
  const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
  return <DashboardClient study={study} assignments={assignments} pairs={pairs} reviews={reviews} recentActivity={activity.events} />;
}
