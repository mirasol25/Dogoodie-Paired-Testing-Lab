import { GlobalDashboard } from "@/components/paired-testing/dashboard/global-dashboard";
import { DashboardClient } from "@/components/paired-testing/dashboard/dashboard-client";
import { requireRole } from "@/lib/auth/server";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyAssignments } from "@/lib/data/assignments";
import { listStudyMatchedPairs, listStudyReviews } from "@/lib/data/matched-pairs";
import { listAccessibleStudies, listProviderServiceOptions } from "@/lib/data/studies";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ study?: string }> }) {
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], "/dashboard");
  const accessible = await listAccessibleStudies();
  const studies = identity.profile.role === "law_firm_viewer" ? accessible.filter((study) => ["completed", "archived"].includes(study.status)) : accessible;
  const requestedStudyId = (await searchParams).study;
  const selectedStudy = requestedStudyId ? studies.find((study) => study.id === requestedStudyId) : undefined;
  if (selectedStudy) {
    const [assignments, pairs, serviceOptions, activity] = await Promise.all([
      listStudyAssignments(selectedStudy.id),
      listStudyMatchedPairs(selectedStudy.id),
      listProviderServiceOptions(),
      listActivityLogFeed(selectedStudy.id, { pageSize: 10 }),
    ]);
    const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
    return <DashboardClient study={selectedStudy} serviceOptions={serviceOptions} assignments={assignments} pairs={pairs} reviews={reviews} recentActivity={activity.events} viewerMode={identity.profile.role === "law_firm_viewer"} />;
  }
  if (!studies.length) return <GlobalDashboard studies={[]} viewerMode={identity.profile.role === "law_firm_viewer"} />;
  const [portfolioRows, serviceOptions] = await Promise.all([
    Promise.all(studies.map(async (study) => {
      const [assignments, pairs, activity] = await Promise.all([
        listStudyAssignments(study.id),
        listStudyMatchedPairs(study.id),
        listActivityLogFeed(study.id, { pageSize: 10 }),
      ]);
      const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
      return { assignments, pairs, reviews, activity: activity.events };
    })),
    listProviderServiceOptions(),
  ]);
  const assignments = portfolioRows.flatMap((row) => row.assignments);
  const pairs = portfolioRows.flatMap((row) => row.pairs);
  const reviews = portfolioRows.flatMap((row) => row.reviews);
  const recentActivity = portfolioRows.flatMap((row) => row.activity).sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()).slice(0, 10);
  const starts = studies.flatMap((study) => study.testing_starts_at ? [study.testing_starts_at] : []).sort();
  const ends = studies.flatMap((study) => study.testing_ends_at ? [study.testing_ends_at] : []).sort();
  return <DashboardClient
    study={studies[0]}
    serviceOptions={serviceOptions}
    assignments={assignments}
    pairs={pairs}
    reviews={reviews}
    recentActivity={recentActivity}
    viewerMode={identity.profile.role === "law_firm_viewer"}
    portfolio={{ studyCount: studies.length, targetPairs: studies.reduce((sum, study) => sum + (study.target_pair_count ?? 0), 0), testingStartsAt: starts[0] ?? null, testingEndsAt: ends.at(-1) ?? null }}
  />;
}
