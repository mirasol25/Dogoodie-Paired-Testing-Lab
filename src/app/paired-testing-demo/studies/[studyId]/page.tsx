import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, FileArchive, GitCompareArrows, MapPin, Users } from "lucide-react";
import { StudyServiceContext } from "@/components/paired-testing/shared/study-service-context";
import { TesterStudyOverview } from "@/components/paired-testing/studies/tester-study-overview";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyAssignments } from "@/lib/data/assignments";
import { listStudyEvidence } from "@/lib/data/evidence";
import { listStudyMatchedPairs } from "@/lib/data/matched-pairs";
import { getActiveProtocol, listStudyProtocols } from "@/lib/data/protocols";
import { listStudyMembers } from "@/lib/data/study-members";
import { getStudyEditorInitialData, listProviderServiceOptions } from "@/lib/data/studies";

function formatDate(value: string | null, timezone: string) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: timezone }).format(new Date(value)) : "Open";
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <div className="bg-background p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="numeric mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div>;
}

export default async function StudyOverviewPage({ params }: PageProps<"/paired-testing-demo/studies/[studyId]">) {
  const { studyId } = await params;
  const identity = await requireActiveUser(`/studies/${studyId}`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();

  if (identity.profile.role === "tester") {
    const assignments = await listStudyAssignments(study.id);
    const items = assignments.flatMap((assignment) => {
      const slot = assignment.testers.find((tester) => tester.userId === identity.user.id);
      return slot ? [{ assignment, slot }] : [];
    }).sort((left, right) => new Date(left.slot.scheduledStart ?? left.assignment.scheduled_start ?? 0).getTime() - new Date(right.slot.scheduledStart ?? right.assignment.scheduled_start ?? 0).getTime());
    return <TesterStudyOverview study={study} items={items} />;
  }

  const canManage = ["admin", "test_coordinator"].includes(identity.profile.role);
  const isViewer = identity.profile.role === "law_firm_viewer";
  const [routeData, protocols, assignments, pairs, evidence, serviceOptions, members] = await Promise.all([
    getStudyEditorInitialData(study.id),
    listStudyProtocols(study.id),
    listStudyAssignments(study.id),
    listStudyMatchedPairs(study.id),
    listStudyEvidence(study.id),
    listProviderServiceOptions(),
    canManage ? listStudyMembers(study.id) : Promise.resolve([]),
  ]);
  const activeProtocol = getActiveProtocol(protocols);
  const completedAssignments = assignments.filter((assignment) => assignment.status === "completed").length;
  const pendingReviews = pairs.filter((pair) => pair.reviewStatus === "pending").length;
  const reviewedPairs = pairs.length - pendingReviews;
  const acceptedPairs = pairs.filter((pair) => pair.reviewStatus === "accepted").length;
  const acceptedUsablePairs = pairs.filter((pair) =>
    pair.reviewStatus === "accepted"
    && pair.evidence_status === "complete"
    && (["valid", "warning"].includes(pair.technical_status) || pair.reviewTechnicalException)
  ).length;
  const workspaceLinks = [
    { label: "Protocol", detail: "Method and requirements", path: "protocol", icon: ClipboardCheck, roles: ["admin", "test_coordinator", "expert_reviewer", "law_firm_viewer"] },
    { label: "Assignments", detail: "Collection schedule", path: "assignments", icon: CalendarDays, roles: ["admin", "test_coordinator", "tester"] },
    { label: "Matched Pairs", detail: "Reviewed comparisons", path: "pairs", icon: GitCompareArrows, roles: ["admin", "test_coordinator", "expert_reviewer", "law_firm_viewer"] },
    { label: "Evidence", detail: "Supporting files", path: "evidence", icon: FileArchive, roles: ["admin", "test_coordinator", "expert_reviewer", "law_firm_viewer"] },
  ].filter((item) => item.roles.includes(identity.profile.role));

  const nextAction = identity.profile.role === "expert_reviewer"
    ? { label: pendingReviews ? `Review ${pendingReviews} pending pair${pendingReviews === 1 ? "" : "s"}` : "Open matched pairs", href: `/studies/${study.id}/pairs` }
      : identity.profile.role === "law_firm_viewer"
        ? { label: "Open released report", href: "/reports" }
        : !activeProtocol
          ? { label: "Configure protocol", href: `/studies/${study.id}/protocol` }
          : assignments.length === 0
            ? { label: "Create assignments", href: `/studies/${study.id}/assignments` }
            : pendingReviews
              ? { label: "Monitor matched pairs", href: `/studies/${study.id}/pairs` }
              : { label: "Review study reports", href: "/reports" };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${study.study_code} · Study overview`}
        title={study.name}
        description={isViewer ? "Inspect the released study method, reviewed results, and supporting evidence." : "Review the study configuration, collection progress, and next operational action."}
        actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/studies"><BookOpen className="size-4" />All studies</Link></Button><Button asChild><Link href={nextAction.href}>{nextAction.label}<ArrowRight className="size-4" /></Link></Button></div>}
      />

      <section className="border-y border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={study.status === "active" ? "default" : "outline"} className="capitalize">{study.status}</Badge>
          <span className="text-xs text-muted-foreground">{study.default_currency ?? "Currency pending"}</span>
          <span className="text-xs text-muted-foreground">{study.display_timezone}</span>
          <span className="text-xs text-muted-foreground">Target: {study.target_pair_count ?? "Not set"} usable pairs</span>
        </div>
        <StudyServiceContext study={study} services={serviceOptions} className="mt-4" />
      </section>

      <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Assignments" value={assignments.length} detail={`${completedAssignments} completed`} />
        <Metric label="Matched pairs" value={pairs.length} detail={`${reviewedPairs} reviewed`} />
        <Metric
          label="Accepted usable pairs"
          value={study.target_pair_count ? `${acceptedUsablePairs} / ${study.target_pair_count}` : acceptedUsablePairs}
          detail={study.target_pair_count ? "Counted toward target" : "Accepted for completion"}
        />
        {isViewer
          ? <Metric label="Accepted pairs" value={acceptedPairs} detail="Included after expert review" />
          : <Metric label="Pending review" value={pendingReviews} detail="Awaiting reviewer decision" />}
        <Metric label="Evidence files" value={evidence.length} detail="Persisted records" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-card/35 px-4 py-3"><MapPin className="size-4 text-primary" /><h2 className="text-sm font-semibold">Route and schedule</h2></div>
          <dl className="divide-y divide-border px-4 text-xs">
            <div className="grid grid-cols-[100px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Route</dt><dd className="font-medium">{routeData?.route.route_name ?? "Route unavailable"}</dd></div>
            <div className="grid grid-cols-[100px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Pickup</dt><dd><p className="font-medium">{routeData?.pickup.label ?? "Unavailable"}</p><p className="mt-1 text-muted-foreground">{routeData?.pickup.formatted_address}</p></dd></div>
            <div className="grid grid-cols-[100px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Destination</dt><dd><p className="font-medium">{routeData?.destination.label ?? "Unavailable"}</p><p className="mt-1 text-muted-foreground">{routeData?.destination.formatted_address}</p></dd></div>
            <div className="grid grid-cols-[100px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Testing period</dt><dd>{formatDate(study.testing_starts_at, study.display_timezone)} – {formatDate(study.testing_ends_at, study.display_timezone)}</dd></div>
          </dl>
        </section>

        <section className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-card/35 px-4 py-3"><ClipboardCheck className="size-4 text-primary" /><h2 className="text-sm font-semibold">{isViewer ? "Method and release" : "Protocol and access"}</h2></div>
          <dl className="divide-y divide-border px-4 text-xs">
            <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Active protocol</dt><dd>{activeProtocol ? <><p className="font-medium">{activeProtocol.title}</p><p className="mt-1 text-muted-foreground">{activeProtocol.protocol_code} · Version {activeProtocol.version}</p></> : <span className="text-amber-300">No active protocol</span>}</dd></div>
            <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Study type</dt><dd className="capitalize">{study.study_type.replaceAll("_", " ")}</dd></div>
            {canManage ? <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Members</dt><dd className="flex items-center justify-between gap-3"><span>{members.filter((member) => member.membership_status === "active").length} active</span><Button asChild variant="ghost" size="sm"><Link href={`/paired-testing-demo/studies/${study.id}/members`}><Users className="size-3.5" />Manage</Link></Button></dd></div> : null}
            <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-muted-foreground">Updated</dt><dd>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.display_timezone }).format(new Date(study.updated_at))}</dd></div>
          </dl>
        </section>
      </div>

      <section className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border bg-card/35 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{isViewer ? "Released study records" : "Study workspace"}</p>
        </div>
        <nav aria-label="Study destinations" className={workspaceLinks.length === 3 ? "grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0" : "grid divide-y divide-border sm:grid-cols-2 sm:divide-x xl:grid-cols-4 xl:divide-y-0"}>
          {workspaceLinks.map(({ label, detail, path, icon: Icon }) => <Link key={path} href={`/studies/${study.id}/${path}`} className="group flex min-h-20 items-center gap-3 bg-background px-4 py-3 transition-colors hover:bg-secondary"><Icon className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium group-hover:text-primary">{label}</span><span className="mt-1 block text-[10px] text-muted-foreground">{detail}</span></span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></Link>)}
        </nav>
      </section>
    </div>
  );
}
