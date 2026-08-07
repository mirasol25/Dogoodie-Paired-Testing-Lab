"use client";

import { ArrowRight, CalendarPlus, ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createAssignmentBatchAction } from "@/app/paired-testing-demo/assignments/actions";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import type { AssignmentSetupOptions, AssignmentSummary, AssignmentTesterOption } from "@/lib/data/assignments";
import type { Study } from "@/lib/data/studies";
import type { StudyCollectionCapacity } from "@/lib/data/collection-capacity";
import { assignmentSetupSchema, assignmentTesterPairSchema } from "@/lib/validation/assignment-schemas";

function testerFor(assignment: AssignmentSummary, slot: "tester_a" | "tester_b") {
  return assignment.testers.find((tester) => tester.slot === slot);
}

function formatSchedule(value: string | null, timezone: string | null) {
  if (!value) return { date: "Not scheduled", time: "Time pending" };
  const date = new Date(value);
  const timeZone = timezone || "UTC";
  return {
    date: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(date),
    time: new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone }).format(date),
  };
}

export function AssignmentsClient({ study, assignments, setupOptions, testerOptions, canManage, capacity }: { study: Study; assignments: AssignmentSummary[]; setupOptions: AssignmentSetupOptions; testerOptions: AssignmentTesterOption[]; canManage: boolean; capacity: StudyCollectionCapacity }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return assignments;
    return assignments.filter((assignment) => {
      const testerA = testerFor(assignment, "tester_a");
      const testerB = testerFor(assignment, "tester_b");
      return [assignment.assignment_code, assignment.protocolCode, assignment.pickup_location, assignment.destination_location, testerA?.displayName, testerA?.email, testerB?.displayName, testerB?.email]
        .join(" ").toLowerCase().includes(search);
    });
  }, [assignments, query]);

  const active = assignments.filter((item) => ["not_started", "in_progress", "awaiting_partner", "ready_for_validation"].includes(item.status)).length;
  const complete = assignments.filter((item) => item.status === "completed").length;

  return <div className="space-y-6">
    <PageHeader eyebrow={`${study.study_code} - Collection operations`} title="Paired Assignments" description="Schedule two authorized testers under one active protocol and controlled testing window." actions={canManage && study.status === "active" ? <AssignmentSetupDialog study={study} options={setupOptions} testers={testerOptions} capacity={capacity} /> : <Badge variant="outline" className="capitalize">{study.status === "active" ? "Read only" : `Study ${study.status}`}</Badge>} />

    {study.status !== "active" ? <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground">Collection is closed while this study is {study.status}. Existing records remain available for authorized review.</div> : null}

    <section className="overflow-hidden rounded-md border border-border"><div className="flex flex-col gap-3 border-b border-border bg-card/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] uppercase text-primary">Collection capacity</p><h2 className="mt-1 text-sm font-semibold">Study target coverage</h2></div><p className={`text-xs ${capacity.replacementNeeded ? "text-amber-300" : "text-muted-foreground"}`}>{capacity.replacementNeeded ? `${capacity.replacementNeeded} replacement ${capacity.replacementNeeded === 1 ? "pair" : "pairs"} needed after rejection` : capacity.canCreate ? `${capacity.assignmentsNeeded} assignment ${capacity.assignmentsNeeded === 1 ? "slot" : "slots"} remaining` : "Target is covered while reviews are pending"}</p></div><div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">{[["Target", capacity.target ?? "Not set"], ["Accepted usable", capacity.acceptedUsable], ["Awaiting review", capacity.awaitingReview], ["Active unpaired", capacity.activeUnpaired], ["Rejected", capacity.rejected]].map(([label, value]) => <div key={String(label)} className="bg-background p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="numeric mt-2 text-2xl font-semibold">{value}</p></div>)}</div><div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border px-4 py-2 text-[10px] text-muted-foreground"><span>Coverage: <strong className="text-foreground">{capacity.coverage}{capacity.target === null ? "" : `/${capacity.target}`}</strong></span><span>{capacity.acceptedWithException} accepted with exception</span><span>Rejected pairs do not count toward coverage.</span></div></section>

    <div className="grid gap-3 sm:grid-cols-3">
      {[["Total assignments", assignments.length], ["Active workflow", active], ["Completed", complete]].map(([label, value]) => <div key={label} className="data-panel rounded-md p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="numeric mt-2 text-2xl font-semibold">{value}</p></div>)}
    </div>

    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-card/35 p-3">
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search assignments" placeholder="Search assignment, route, or tester" className="h-9 bg-background/45 pl-9 text-xs" /></div>
      </div>
      <div className="overflow-x-auto">
        <Table><TableHeader><TableRow><TableHead>Assignment</TableHead><TableHead>Tester A</TableHead><TableHead>Tester B</TableHead><TableHead>Schedule</TableHead><TableHead>Route</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader>
          <TableBody>{visible.map((assignment) => {
            const testerA = testerFor(assignment, "tester_a");
            const testerB = testerFor(assignment, "tester_b");
            const start = formatSchedule(assignment.scheduled_start, study.display_timezone);
            const end = formatSchedule(assignment.scheduled_end, study.display_timezone);
            return <TableRow key={assignment.id}>
              <TableCell className="min-w-40"><p className="mono font-semibold">{assignment.assignment_code}</p><p className="mono mt-1 text-[10px] text-muted-foreground">{assignment.protocolCode} v{assignment.protocolVersion}</p></TableCell>
              <TableCell className="min-w-44"><p className="font-medium">{testerA?.displayName ?? "Unassigned"}</p><p className="mt-1 text-[10px] capitalize text-muted-foreground">{testerA?.status?.replaceAll("_", " ") ?? "Slot pending"}</p></TableCell>
              <TableCell className="min-w-44"><p className="font-medium">{testerB?.displayName ?? "Unassigned"}</p><p className="mt-1 text-[10px] capitalize text-muted-foreground">{testerB?.status?.replaceAll("_", " ") ?? "Slot pending"}</p></TableCell>
              <TableCell className="min-w-44 whitespace-nowrap"><p>{start.date}</p><p className="mono mt-1 text-[10px] text-muted-foreground">{start.time} - {end.time}</p></TableCell>
              <TableCell className="min-w-64 text-xs"><p>{assignment.pickup_location}</p><p className="mt-1 text-muted-foreground">to {assignment.destination_location}</p></TableCell>
              <TableCell><StatusBadge status={assignment.status} /></TableCell>
              <TableCell><Button asChild size="icon-sm" variant="ghost"><Link href={`/paired-testing-demo/assignments/${assignment.id}`} aria-label={`Open ${assignment.assignment_code}`}><ArrowRight className="size-4" /></Link></Button></TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>
      </div>
      {!visible.length ? <div className="flex flex-col items-center border-t border-border px-6 py-12 text-center"><ClipboardList className="size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{assignments.length ? "No matching assignments" : "No assignments yet"}</p><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{assignments.length ? "Try a different assignment, route, or tester search." : canManage ? "The first assignment will connect an active protocol, a configured route, and two study testers." : "No paired tests have been assigned for this study."}</p></div> : null}
    </div>
  </div>;
}

function localInputValue(value: string | null, timezone: string) {
  if (!value) return "";
  const date = toZonedTime(new Date(value), timezone);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function AssignmentSetupDialog({ study, options, testers, capacity }: { study: Study; options: AssignmentSetupOptions; testers: AssignmentTesterOption[]; capacity: StudyCollectionCapacity }) {
  const defaultService = options.services[0]?.id ?? "";
  const defaultServiceDetails = options.services[0];
  const defaultTesterBService = study.study_type === "cross_platform_comparison" && defaultServiceDetails
    ? options.services.find((service) => service.platformId !== defaultServiceDetails.platformId && service.normalizedCategory === defaultServiceDetails.normalizedCategory)?.id ?? ""
    : defaultService;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pending, startTransition] = useTransition();
  const protocolId = options.protocols[0]?.id ?? "";
  const routeId = options.routes[0]?.id ?? "";
  const testerAServiceId = defaultService;
  const testerBServiceId = defaultTesterBService;
  const [testingDate, setTestingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [testerPairs, setTesterPairs] = useState([{ testerAId: "", testerBId: "" }]);
  const [instructions, setInstructions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCrossPlatform = study.study_type === "cross_platform_comparison";
  const selectedRoute = options.routes.find((route) => route.id === routeId);
  const timezone = selectedRoute?.timezone || study.display_timezone || "UTC";
  const testerAService = options.services.find((service) => service.id === testerAServiceId);
  const currentStudyDateTime = localInputValue(new Date().toISOString(), timezone);
  const minimumDate = [currentStudyDateTime.slice(0, 10), localInputValue(study.testing_starts_at, timezone).slice(0, 10)].filter(Boolean).sort().at(-1) ?? "";
  const maximumDate = localInputValue(study.testing_ends_at, timezone).slice(0, 10);
  const setupReady = options.protocols.length > 0 && options.routes.length > 0 && Boolean(testerAServiceId) && Boolean(testerBServiceId) && testers.length >= 2;
  const maximumPairs = Math.max(1, Math.min(Math.floor(testers.length / 2), capacity.target === null ? Math.floor(testers.length / 2) : capacity.assignmentsNeeded));

  function resetAssignmentForm() {
    setStep(0);
    setTestingDate("");
    setStartTime("");
    setEndTime("");
    setTesterPairs([{ testerAId: "", testerBId: "" }]);
    setInstructions("");
    setErrors({});
  }

  function setPairCount(value: number) {
    const count = Math.max(1, Math.min(maximumPairs, value || 1));
    setTesterPairs((current) => Array.from({ length: count }, (_, index) => current[index] ?? { testerAId: "", testerBId: "" }));
    setErrors({});
  }

  function updateTesterPair(index: number, side: "testerAId" | "testerBId", value: string) {
    setTesterPairs((current) => current.map((pair, pairIndex) => {
      if (pairIndex !== index) return pair;
      const next = { ...pair, [side]: value };
      if (side === "testerAId" && next.testerBId === value) next.testerBId = "";
      return next;
    }));
    setErrors({});
  }

  function continueToPair() {
    const parsed = assignmentSetupSchema.safeParse({
      protocolId,
      routeId,
      testerAServiceId,
      testerBServiceId: isCrossPlatform ? testerBServiceId : testerAServiceId,
      testingDate,
      startTime,
      endTime,
    });
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) parsed.error.issues.forEach((issue) => { nextErrors[String(issue.path[0])] ??= issue.message; });
    const startsAt = testingDate && startTime ? fromZonedTime(`${testingDate}T${startTime}`, timezone) : null;
    const endsAt = testingDate && endTime ? fromZonedTime(`${testingDate}T${endTime}`, timezone) : null;
    if (startsAt && startsAt <= new Date()) nextErrors.startTime = "The testing window must be in the future in the route timezone.";
    if (startsAt && study.testing_starts_at && startsAt < new Date(study.testing_starts_at)) nextErrors.testingDate = "The assignment starts before the study testing period.";
    if (endsAt && study.testing_ends_at && endsAt > new Date(study.testing_ends_at)) nextErrors.endTime = "The assignment ends after the study testing period.";
    if (isCrossPlatform) {
      const serviceB = options.services.find((service) => service.id === testerBServiceId);
      if (testerAService && serviceB && (testerAService.platformId === serviceB.platformId || testerAService.normalizedCategory !== serviceB.normalizedCategory)) {
        nextErrors.testerBServiceId = "Select the same ride category from a different provider.";
      }
    }
    if (testerPairs.length > maximumPairs) nextErrors.testerPairs = `Select no more than ${maximumPairs} pair${maximumPairs === 1 ? "" : "s"} for the remaining study capacity.`;
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep(1);
  }

  function continueToReview() {
    const nextErrors: Record<string, string> = {};
    testerPairs.forEach((pair, index) => {
      const parsed = assignmentTesterPairSchema.safeParse(pair);
      if (!parsed.success) parsed.error.issues.forEach((issue) => { nextErrors[`pairs.${index}.${String(issue.path[0])}`] ??= issue.message; });
    });
    const selectedTesterIds = testerPairs.flatMap((pair) => [pair.testerAId, pair.testerBId]).filter(Boolean);
    if (new Set(selectedTesterIds).size !== selectedTesterIds.length) nextErrors.testerPairs = "A tester can be assigned only once in this batch.";
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep(2);
  }

  function submitAssignmentBatch() {
    startTransition(async () => {
      const result = await createAssignmentBatchAction({ studyId: study.id, protocolId, routeId, testerAServiceId, testerBServiceId: isCrossPlatform ? testerBServiceId : testerAServiceId, testingDate, startTime, endTime, testerPairs, timezone, instructions });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      resetAssignmentForm();
      setOpen(false);
    });
  }

  const collectionClosed = Boolean(study.testing_ends_at && localInputValue(study.testing_ends_at, timezone) <= currentStudyDateTime);
  const creationBlocked = !capacity.canCreate || collectionClosed;
  const creationLabel = collectionClosed ? "Collection closed" : capacity.replacementNeeded > 0 ? "Create replacement" : "Create assignment";

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button disabled={creationBlocked} title={collectionClosed ? "The study testing period has ended. Extend the study window before creating replacement assignments." : creationBlocked ? "The study target is covered by accepted, pending-review, or active paired sessions." : undefined}><CalendarPlus className="size-4" />{creationLabel}</Button></DialogTrigger>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader className="border-b border-border pb-4"><div className="flex items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10"><CalendarPlus className="size-4 text-primary" /></div><div><DialogTitle>Create assignment</DialogTitle><DialogDescription className="mt-1">{step === 0 ? "Confirm the study controls and schedule the testing window." : step === 1 ? "Assign one eligible study tester to each protocol side." : "Verify the complete paired session before creation."}</DialogDescription></div></div></DialogHeader>
      {!setupReady ? <div className="border-y border-border py-6 text-sm"><p className="font-medium">Assignment setup is not ready.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This study needs an active protocol, an active route, configured provider ride tiers, and at least two active Tester members.</p></div> : <div className="space-y-6">
        <div className="grid grid-cols-3 rounded-md border border-border bg-secondary/25 p-1 text-center text-xs"><button type="button" onClick={() => { setStep(0); setErrors({}); }} className={`h-9 rounded-sm font-medium ${step === 0 ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>1. Test setup</button><button type="button" disabled={step === 0} onClick={() => { setStep(1); setErrors({}); }} className={`h-9 rounded-sm font-medium ${step === 1 ? "bg-background text-primary shadow-sm" : "text-muted-foreground enabled:hover:text-foreground"}`}>2. Tester pair</button><span className={`flex h-9 items-center justify-center rounded-sm font-medium ${step === 2 ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>3. Review</span></div>
        {step === 0 ? <>
        <section className="space-y-3"><div><p className="text-xs font-semibold">Study controls</p><p className="mt-1 text-xs text-muted-foreground">Inherited from {study.study_code}</p></div>
        <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 sm:divide-x sm:divide-border">
          <LockedField label="Active protocol" value={options.protocols[0] ? `${options.protocols[0].code} v${options.protocols[0].version}` : "Unavailable"} detail={options.protocols[0]?.title} />
          <LockedField label="Study route" value={selectedRoute?.name ?? "Unavailable"} detail={timezone} />
        </div>
        {routeId ? (() => { const route = options.routes.find((item) => item.id === routeId); return route ? <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2"><div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-[10px] uppercase text-muted-foreground">Pickup</p><p className="mt-1.5 text-xs font-medium">{route.pickup}</p></div><div className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Destination</p><p className="mt-1.5 text-xs font-medium">{route.destination}</p></div></div> : null; })() : null}
        <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 sm:divide-x sm:divide-border">
          <LockedField label={isCrossPlatform ? "Tester A provider and tier" : "Provider and ride tier"} value={testerAService ? `${testerAService.platformName} - ${testerAService.serviceName}` : "Unavailable"} detail={testerAService?.normalizedCategory.replaceAll("_", " ")} />
          {isCrossPlatform ? <LockedField label="Tester B provider and tier" value={options.services.find((service) => service.id === testerBServiceId) ? `${options.services.find((service) => service.id === testerBServiceId)?.platformName} - ${options.services.find((service) => service.id === testerBServiceId)?.serviceName}` : "Unavailable"} detail={testerAService?.normalizedCategory.replaceAll("_", " ")} /> : <LockedField label="Tester B provider and tier" value={testerAService ? `${testerAService.platformName} - ${testerAService.serviceName}` : "Unavailable"} detail="Same fixed service as Tester A" />}
        </div>
        </section>
        <section className="space-y-4 rounded-md border border-primary/25 bg-primary/[0.025] p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm font-semibold">Testing window</p><p className="mt-1 text-xs text-muted-foreground">One synchronized session per tester pair</p></div><div className="text-right"><p className="mono text-[10px] font-medium text-primary">{timezone}</p><p className="mt-1 text-[10px] text-muted-foreground">{currentStudyDateTime.replace("T", " ")}</p></div></div>
        <div className="grid gap-4 sm:grid-cols-4">
          <DateTimeField type="date" label="Testing date" value={testingDate} onChange={(value) => { setTestingDate(value); setErrors({}); }} min={minimumDate} max={maximumDate || undefined} error={errors.testingDate} />
          <DateTimeField type="time" label="Window starts" value={startTime} onChange={(value) => { setStartTime(value); setErrors({}); }} error={errors.startTime} />
          <DateTimeField type="time" label="Window ends" value={endTime} onChange={(value) => { setEndTime(value); setErrors({}); }} min={startTime || undefined} error={errors.endTime} />
          <div className="space-y-2"><Label htmlFor="assignment-pair-count">Paired sessions</Label><Input id="assignment-pair-count" type="number" min={1} max={maximumPairs} value={testerPairs.length} onChange={(event) => setPairCount(Number(event.target.value))} /><p className="text-[10px] text-muted-foreground">Up to {maximumPairs} using distinct testers.</p></div>
        </div>
        <p className="text-[11px] text-muted-foreground">Schedule interpreted in the route timezone.</p></section>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={continueToPair}>Continue</Button></div>
        </> : step === 1 ? <TesterPairStep protocol={options.protocols.find((protocol) => protocol.id === protocolId)} serviceA={options.services.find((service) => service.id === testerAServiceId)} serviceB={options.services.find((service) => service.id === (isCrossPlatform ? testerBServiceId : testerAServiceId))} testers={testers} pairs={testerPairs} errors={errors} onChange={updateTesterPair} onBack={() => { setStep(0); setErrors({}); }} onContinue={continueToReview} /> : <AssignmentReview study={study} protocol={options.protocols.find((protocol) => protocol.id === protocolId)} route={selectedRoute} serviceA={options.services.find((service) => service.id === testerAServiceId)} serviceB={options.services.find((service) => service.id === (isCrossPlatform ? testerBServiceId : testerAServiceId))} testers={testers} pairs={testerPairs} testingDate={testingDate} startTime={startTime} endTime={endTime} timezone={timezone} instructions={instructions} pending={pending} onInstructionsChange={setInstructions} onBack={() => setStep(1)} onCreate={submitAssignmentBatch} />}
      </div>}
    </DialogContent>
  </Dialog>;
}

function TesterPairStep({ protocol, serviceA, serviceB, testers, pairs, errors, onChange, onBack, onContinue }: { protocol?: AssignmentSetupOptions["protocols"][number]; serviceA?: AssignmentSetupOptions["services"][number]; serviceB?: AssignmentSetupOptions["services"][number]; testers: AssignmentTesterOption[]; pairs: Array<{ testerAId: string; testerBId: string }>; errors: Record<string, string>; onChange: (index: number, side: "testerAId" | "testerBId", value: string) => void; onBack: () => void; onContinue: () => void }) {
  const assigned = new Set(pairs.flatMap((pair) => [pair.testerAId, pair.testerBId]).filter(Boolean));
  return <div className="space-y-6">
    <div><p className="text-sm font-semibold">Assign tester pairs</p><p className="mt-1 text-xs text-muted-foreground">Each account can appear only once in this batch. Every pair keeps the same controlled route, tier, and schedule.</p></div>
    {errors.testerPairs ? <p className="text-xs text-red-300">{errors.testerPairs}</p> : null}
    <div className="space-y-4">{pairs.map((pair, index) => {
      const availableFor = (current: string) => testers.filter((tester) => tester.id === current || !assigned.has(tester.id));
      const testerA = testers.find((tester) => tester.id === pair.testerAId);
      const testerB = testers.find((tester) => tester.id === pair.testerBId);
      return <section key={index} className="overflow-hidden rounded-md border border-border"><div className="flex items-center justify-between border-b border-border bg-secondary/20 px-4 py-3"><p className="text-sm font-semibold">Pair {index + 1}</p><p className="text-[10px] uppercase text-muted-foreground">{testerA && testerB ? "Ready" : "Needs testers"}</p></div><div className="grid gap-4 p-4 sm:grid-cols-2">
        <TesterSide side="Tester A" condition={protocol?.testerAValue ?? "Not configured"} variable={protocol?.isolatedVariable ?? "Protocol condition"} service={serviceA ? `${serviceA.platformName} - ${serviceA.serviceName}` : "Not selected"} selectedId={pair.testerAId} testers={availableFor(pair.testerAId).filter((tester) => tester.id !== pair.testerBId)} error={errors[`pairs.${index}.testerAId`]} onChange={(value) => onChange(index, "testerAId", value)} />
        <TesterSide side="Tester B" condition={protocol?.testerBValue ?? "Not configured"} variable={protocol?.isolatedVariable ?? "Protocol condition"} service={serviceB ? `${serviceB.platformName} - ${serviceB.serviceName}` : "Not selected"} selectedId={pair.testerBId} testers={availableFor(pair.testerBId).filter((tester) => tester.id !== pair.testerAId)} error={errors[`pairs.${index}.testerBId`]} onChange={(value) => onChange(index, "testerBId", value)} />
      </div></section>;
    })}</div>
    <div className="flex items-center justify-between border-t border-border pt-4"><Button variant="outline" onClick={onBack}>Back</Button><Button onClick={onContinue}>Continue</Button></div>
  </div>;
}

function TesterSide({ side, condition, variable, service, selectedId, testers, error, onChange }: { side: string; condition: string; variable: string; service: string; selectedId: string; testers: AssignmentTesterOption[]; error?: string; onChange: (value: string) => void }) {
  const selected = testers.find((tester) => tester.id === selectedId);
  return <section className={`min-w-0 overflow-hidden rounded-md border border-border border-t-2 ${side === "Tester A" ? "border-t-primary" : "border-t-amber-400"}`}><div className="border-b border-border bg-secondary/20 px-4 py-3"><p className="text-sm font-semibold">{side}</p><p className="mt-1 text-xs text-muted-foreground">{service}</p></div><div className="space-y-4 p-4"><SelectField label="Tester account" value={selectedId} onChange={onChange} error={error} options={testers.map((tester) => ({ value: tester.id, label: tester.displayName }))} /><div className="border-t border-border pt-3"><p className="text-[10px] uppercase text-muted-foreground">Assigned condition - {variable}</p><p className="mt-1 text-sm font-medium">{condition}</p>{selected ? <p className="mt-1 break-all text-[10px] text-muted-foreground">{selected.email}</p> : null}</div></div></section>;
}

function AssignmentReview({ study, protocol, route, serviceA, serviceB, testers, pairs, testingDate, startTime, endTime, timezone, instructions, pending, onInstructionsChange, onBack, onCreate }: { study: Study; protocol?: AssignmentSetupOptions["protocols"][number]; route?: AssignmentSetupOptions["routes"][number]; serviceA?: AssignmentSetupOptions["services"][number]; serviceB?: AssignmentSetupOptions["services"][number]; testers: AssignmentTesterOption[]; pairs: Array<{ testerAId: string; testerBId: string }>; testingDate: string; startTime: string; endTime: string; timezone: string; instructions: string; pending: boolean; onInstructionsChange: (value: string) => void; onBack: () => void; onCreate: () => void }) {
  const formatTime = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2020, 0, 1, hours, minutes)));
  };
  const dateLabel = testingDate ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${testingDate}T00:00:00Z`)) : "Not selected";
  return <div className="space-y-6">
    <div><p className="text-sm font-semibold">Batch assignment summary</p><p className="mt-1 text-xs text-muted-foreground">Review {pairs.length} controlled paired session{pairs.length === 1 ? "" : "s"} before creation.</p></div>
    <div className="grid gap-x-6 gap-y-4 border-y border-border py-5 sm:grid-cols-2">
      <ReviewItem label="Study" value={study.name} detail={study.study_code} />
      <ReviewItem label="Protocol" value={protocol?.title ?? "Unavailable"} detail={protocol ? `${protocol.code} v${protocol.version}` : undefined} />
      <ReviewItem label="Route" value={route?.name ?? "Unavailable"} detail={route ? `${route.pickup} to ${route.destination}` : undefined} />
      <ReviewItem label="Testing window" value={`${dateLabel}, ${formatTime(startTime)}-${formatTime(endTime)}`} detail={timezone} />
    </div>
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">{pairs.map((pair, index) => <div key={index} className="grid gap-3 p-4 sm:grid-cols-[7rem_1fr_1fr]"><p className="text-xs font-semibold">Pair {index + 1}</p><ReviewTester side="Tester A" tester={testers.find((tester) => tester.id === pair.testerAId)} service={serviceA} variable={protocol?.isolatedVariable} condition={protocol?.testerAValue} /><ReviewTester side="Tester B" tester={testers.find((tester) => tester.id === pair.testerBId)} service={serviceB} variable={protocol?.isolatedVariable} condition={protocol?.testerBValue} /></div>)}</div>
    <div className="space-y-2"><Label htmlFor="assignment-instructions">Operational instructions <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="assignment-instructions" value={instructions} onChange={(event) => onInstructionsChange(event.target.value)} maxLength={1000} rows={3} placeholder="Add session-specific coordination or route reminders." /><p className="text-xs text-muted-foreground">These instructions supplement the active protocol and cannot change its conditions.</p></div>
    <div className="flex items-center justify-between border-t border-border pt-4"><Button variant="outline" onClick={onBack} disabled={pending}>Back</Button><div className="flex items-center gap-3"><p className="hidden text-xs text-muted-foreground sm:block">Creates {pairs.length} assignments and {pairs.length * 2} tester slots</p><Button onClick={onCreate} disabled={pending}>{pending ? "Creating..." : `Create ${pairs.length} assignment${pairs.length === 1 ? "" : "s"}`}</Button></div></div>
  </div>;
}

function ReviewItem({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p>{detail ? <p className="mt-1 break-words text-xs text-muted-foreground">{detail}</p> : null}</div>;
}

function LockedField({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0 p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1.5 text-sm font-medium">{value}</p>{detail ? <p className="mt-1 break-words text-xs capitalize text-muted-foreground">{detail}</p> : null}</div>;
}

function ReviewTester({ side, tester, service, variable, condition }: { side: string; tester?: AssignmentTesterOption; service?: AssignmentSetupOptions["services"][number]; variable?: string; condition?: string }) {
  return <section className="space-y-3 rounded-md border border-border p-4"><div><p className="text-xs font-semibold">{side}</p><p className="mt-1 text-sm">{tester?.displayName ?? "Unavailable"}</p><p className="mt-1 text-[10px] text-muted-foreground">{tester?.email}</p></div><div className="border-t border-border pt-3 text-xs"><p>{service ? `${service.platformName} - ${service.serviceName}` : "Service unavailable"}</p><p className="mt-2 text-muted-foreground">{variable}: <span className="text-foreground">{condition}</span></p></div></section>;
}

function SelectField({ label, value, onChange, options, error, placeholder = "Select an option" }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; error?: string; placeholder?: string }) {
  const id = `assignment-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div className="min-w-0 space-y-2"><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}

function DateTimeField({ type, label, value, onChange, min, max, error }: { type: "date" | "time"; label: string; value: string; onChange: (value: string) => void; min?: string; max?: string; error?: string }) {
  const id = `assignment-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} aria-invalid={Boolean(error)} />{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}
