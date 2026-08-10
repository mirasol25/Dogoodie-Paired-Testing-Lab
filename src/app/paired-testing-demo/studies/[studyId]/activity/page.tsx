import { notFound } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { AuditClient } from "@/components/paired-testing/audit/audit-client";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogCategories, listActivityLogFeed, listActivityLogFilterOptions } from "@/lib/data/activity-logs";

export default async function StudyActivityPage({ params, searchParams }: PageProps<"/paired-testing-demo/studies/[studyId]/activity">) {
  const [{ studyId }, query] = await Promise.all([params, searchParams]);
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], `/studies/${studyId}/activity`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  const page = Number.isInteger(Number(query.page)) ? Math.max(Number(query.page), 1) : 1;
  const fromValue = typeof query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : undefined;
  const toValue = typeof query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : undefined;
  const value = (entry: string | string[] | undefined) => typeof entry === "string" ? entry : undefined;
  const filters = { search: value(query.q), category: value(query.category), actorId: value(query.actor), targetType: value(query.target), action: value(query.action), dateFrom: fromValue ? fromZonedTime(`${fromValue}T00:00:00`, study.display_timezone).toISOString() : undefined, dateTo: toValue ? fromZonedTime(`${toValue}T23:59:59.999`, study.display_timezone).toISOString() : undefined, page };
  const [feed, categories, options] = await Promise.all([listActivityLogFeed(study.id, filters), listActivityLogCategories(study.id), listActivityLogFilterOptions(study.id, filters.category)]);
  return <AuditClient role={identity.profile.role} study={{ code: study.study_code, name: study.name, timezone: study.display_timezone }} events={feed.events} categories={categories} options={options} filters={{ search: filters.search ?? "", category: filters.category ?? "", actorId: filters.actorId ?? "", targetType: filters.targetType ?? "", action: filters.action ?? "", dateFrom: fromValue ?? "", dateTo: toValue ?? "", page: feed.page, pageSize: feed.pageSize, total: feed.total }} basePath={`/studies/${study.id}/activity`} />;
}
