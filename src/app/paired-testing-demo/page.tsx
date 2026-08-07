import { OverviewClient } from "@/components/paired-testing/overview/overview-client";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listStudyAssignments } from "@/lib/data/assignments";
import { listStudyMatchedPairs, listStudyReviews } from "@/lib/data/matched-pairs";
import { listProviderServiceOptions } from "@/lib/data/studies";

export default async function OverviewPage() {
  const identity = await requireActiveUser("/paired-testing-demo");
  const study = await getActiveStudy();
  if (!study) return <OverviewClient study={null} serviceOptions={[]} pairs={[]} reviews={[]} activity={[]} assignments={[]} currentUserId={identity.user.id} role={identity.profile.role} />;

  if (identity.profile.role === "tester") {
    const [assignments, activity, serviceOptions] = await Promise.all([
      listStudyAssignments(study.id),
      listActivityLogFeed(study.id, { pageSize: 4 }),
      listProviderServiceOptions(),
    ]);

    return <OverviewClient study={study} serviceOptions={serviceOptions} pairs={[]} reviews={[]} activity={activity.events} assignments={assignments} currentUserId={identity.user.id} role={identity.profile.role} />;
  }

  const [pairs, activity, serviceOptions] = await Promise.all([listStudyMatchedPairs(study.id), listActivityLogFeed(study.id, { pageSize: 1 }), listProviderServiceOptions()]);
  const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
  return <OverviewClient study={study} serviceOptions={serviceOptions} pairs={pairs} reviews={reviews} activity={activity.events} assignments={[]} currentUserId={identity.user.id} role={identity.profile.role} />;
}
