import { OverviewClient } from "@/components/paired-testing/overview/overview-client";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyAssignments } from "@/lib/data/assignments";
import { listStudyMatchedPairs, listStudyReviews } from "@/lib/data/matched-pairs";

export default async function OverviewPage() {
  const identity = await requireActiveUser("/paired-testing-demo");
  const study = await getActiveStudy();
  if (!study) return <OverviewClient study={null} pairs={[]} reviews={[]} activity={[]} assignments={[]} currentUserId={identity.user.id} role={identity.profile.role} />;

  if (identity.profile.role === "tester") {
    const [assignments, activity] = await Promise.all([
      listStudyAssignments(study.id),
      listActivityLogFeed(study.id, { pageSize: 4 }),
    ]);

    return <OverviewClient study={study} pairs={[]} reviews={[]} activity={activity.events} assignments={assignments} currentUserId={identity.user.id} role={identity.profile.role} />;
  }

  const [pairs, activity] = await Promise.all([listStudyMatchedPairs(study.id), listActivityLogFeed(study.id, { pageSize: 1 })]);
  const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
  return <OverviewClient study={study} pairs={pairs} reviews={reviews} activity={activity.events} assignments={[]} currentUserId={identity.user.id} role={identity.profile.role} />;
}
