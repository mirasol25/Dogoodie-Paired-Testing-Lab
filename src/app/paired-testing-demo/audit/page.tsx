import { GlobalAuditClient } from "@/components/paired-testing/audit/global-audit-client";
import { requireRole } from "@/lib/auth/server";
import { listActivityLogFeed } from "@/lib/data/activity-logs";
import { listAccessibleStudies } from "@/lib/data/studies";

export default async function AuditPage() {
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], "/audit");
  const accessible = await listAccessibleStudies();
  const studies = identity.profile.role === "law_firm_viewer" ? accessible.filter((study) => ["completed", "archived"].includes(study.status)) : accessible;
  const feeds = await Promise.all(studies.map(async (study) => ({ study, feed: await listActivityLogFeed(study.id, { pageSize: 100 }) })));
  const events = feeds.flatMap(({ study, feed }) => feed.events.map((event) => ({ event, studyId: study.id, studyCode: study.study_code, studyName: study.name, timezone: study.display_timezone }))).sort((left, right) => new Date(right.event.created_at).getTime() - new Date(left.event.created_at).getTime());
  return <GlobalAuditClient events={events} studies={studies.map((study) => ({ id: study.id, code: study.study_code, name: study.name }))} />;
}
