import { AuditClient } from "@/components/paired-testing/audit/audit-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listActivityLogCategories, listActivityLogFeed } from "@/lib/data/activity-logs";
import { listActivityLogFilterOptions } from "@/lib/data/activity-logs";
import { fromZonedTime } from "date-fns-tz";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; actor?: string; target?: string; action?: string; from?: string; to?: string; page?: string }> }) {
  const identity = await requireActiveUser("/paired-testing-demo/audit");
  const study = await getActiveStudy();
  if (!study) return <div className="space-y-6"><PageHeader eyebrow="Operational history" title="Activity Log" description="Select an accessible study to inspect its activity." /></div>;
  const params = await searchParams;
  const page = Number.isInteger(Number(params.page)) ? Math.max(Number(params.page), 1) : 1;
  const fromValue = params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : undefined;
  const toValue = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : undefined;
  const dateFrom = fromValue ? fromZonedTime(`${fromValue}T00:00:00`, study.display_timezone).toISOString() : undefined;
  const dateTo = toValue ? fromZonedTime(`${toValue}T23:59:59.999`, study.display_timezone).toISOString() : undefined;
  const [feed, categories, options] = await Promise.all([listActivityLogFeed(study.id, { search: params.q, category: params.category, actorId: params.actor, targetType: params.target, action: params.action, dateFrom, dateTo, page }), listActivityLogCategories(study.id), listActivityLogFilterOptions(study.id)]);
  return <AuditClient role={identity.profile.role} study={{ code: study.study_code, name: study.name, timezone: study.display_timezone }} events={feed.events} categories={categories} options={options} filters={{ search: params.q ?? "", category: params.category ?? "", actorId: params.actor ?? "", targetType: params.target ?? "", action: params.action ?? "", dateFrom: fromValue ?? "", dateTo: toValue ?? "", page: feed.page, pageSize: feed.pageSize, total: feed.total }} />;
}
