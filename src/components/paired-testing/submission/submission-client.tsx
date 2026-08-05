"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Clock3, FileImage, Film, FlaskConical, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { assignmentsFixture, testerProfilesFixture } from "@/data/paired-testing-demo.fixtures";
import { testerSubmissionSchema, type TesterSubmissionFormValues } from "@/lib/validation/form-schemas";
import { useDemoStore } from "@/store/paired-testing-demo.store";
import type { TestSubmission } from "@/types/paired-testing-demo.types";
import { DisclaimerAlert } from "@/components/paired-testing/shared/disclaimer-alert";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";

const checklist = [
  "Correct account profile", "Correct app version", "Correct pickup", "Correct destination",
  "Correct ride tier", "Screen recording prepared", "Partner confirmed ready",
  "Device location enabled for demonstration metadata",
];

export function SubmissionClient() {
  const assignment = assignmentsFixture[7];
  const tester = testerProfilesFixture[0];
  const [checks, setChecks] = useState<string[]>([]);
  const [stage, setStage] = useState<"checklist" | "countdown" | "form" | "submitted">("checklist");
  const [count, setCount] = useState(3);
  const [selectedFiles, setSelectedFiles] = useState<{ screenshot?: File; recording?: File }>({});
  const saveDraft = useDemoStore((state) => state.saveTesterDraft);
  const submitResponse = useDemoStore((state) => state.submitTesterResponse);
  const draft = useDemoStore((state) => state.testerDraft);
  const form = useForm<TesterSubmissionFormValues>({
    resolver: zodResolver(testerSubmissionSchema),
    defaultValues: {
      displayedPrice: 47.8, currency: "USD", platform: demoConfig.study.platform,
      quoteTimestamp: "2026-05-14T10:14:22", latitude: 40.75814, longitude: -73.9855,
      networkType: "5G", deviceType: tester.deviceType, operatingSystem: tester.operatingSystem,
      operatingSystemVersion: tester.operatingSystemVersion, appVersion: tester.appVersion,
      batteryPercentage: 82, accountProfileCategory: tester.accountProfileCategory,
      membershipStatus: tester.membershipStatus, rideTier: demoConfig.study.rideTier,
      pickup: demoConfig.study.pickup, destination: demoConfig.study.destination, notes: "",
    },
  });

  useEffect(() => {
    if (stage !== "countdown") return;
    if (count === 0) {
      const timeout = window.setTimeout(() => setStage("form"), 650);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setCount((current) => current - 1), 850);
    return () => window.clearTimeout(timeout);
  }, [stage, count]);

  const buildSubmission = (values: TesterSubmissionFormValues): TestSubmission => ({
    id: "SUB-A-LOCAL-001",
    assignmentId: assignment.id,
    pairId: assignment.pairId,
    testerId: tester.id,
    testerAlias: tester.alias,
    testerRole: "Tester A",
    platform: values.platform,
    displayedPrice: values.displayedPrice,
    currency: values.currency,
    quoteTimestamp: new Date(`${values.quoteTimestamp}-04:00`).toISOString(),
    latitude: values.latitude,
    longitude: values.longitude,
    networkType: values.networkType,
    deviceType: values.deviceType,
    operatingSystem: values.operatingSystem,
    operatingSystemVersion: values.operatingSystemVersion,
    appVersion: values.appVersion,
    batteryPercentage: values.batteryPercentage,
    accountProfileCategory: values.accountProfileCategory,
    membershipStatus: values.membershipStatus,
    rideTier: values.rideTier,
    pickup: values.pickup,
    destination: values.destination,
    notes: values.notes ?? "",
    evidenceFileIds: ["LOCAL-SCREENSHOT", "LOCAL-RECORDING"],
    submissionStatus: "submitted",
    submittedAt: new Date().toISOString(),
  });

  const submit = form.handleSubmit((values) => {
    if (!selectedFiles.screenshot || !selectedFiles.recording) {
      toast.error("Select both required local evidence files.");
      return;
    }
    submitResponse(buildSubmission(values));
    setStage("submitted");
    toast.success("Synthetic test submitted. Awaiting paired validation.");
  });
  const save = () => {
    saveDraft(assignment.id, form.getValues() as unknown as Record<string, unknown>);
    toast.success("Draft saved in local demonstration state.");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Mobile-first tester workflow" title="Tester Submission" description="Simulate a synchronized quote request and capture synthetic submission metadata. No rideshare service is contacted." />
      <DisclaimerAlert compact />
      <Card className="data-panel overflow-hidden">
        <div className="grid gap-px bg-border sm:grid-cols-4">
          {[["Assignment", assignment.id], ["Pair", assignment.pairId], ["Tester", tester.alias], ["Status", stage === "submitted" ? "Submitted" : draft ? "Draft saved" : "Ready"]].map(([label, value]) => <div key={label} className="bg-card p-4"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mono mt-2 text-sm font-semibold">{value}</p></div>)}
        </div>
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Platform / tier" value={`${demoConfig.study.platform} · ${demoConfig.study.rideTier}`} />
            <Detail label="Scheduled window" value="May 14, 2026 · 10:12–10:24 AM ET" />
            <Detail label="Route" value={`${demoConfig.study.pickup} → ${demoConfig.study.destination}`} />
            <Detail label="Profile / variable" value={`${tester.accountProfileCategory} · ${tester.membershipStatus}`} />
          </div>
        </CardContent>
      </Card>

      {stage === "checklist" && (
        <Card className="data-panel"><CardContent className="p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="label-kicker">Step 1</p><h2 className="mt-2 text-lg font-semibold">Pre-test checklist</h2><p className="mt-1 text-xs text-muted-foreground">Confirm all preliminary controls before beginning the simulated synchronized request.</p></div><StatusBadge status={checks.length === checklist.length ? "complete" : "pending"} /></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">{checklist.map((item) => <label key={item} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-secondary/25 px-3 py-2 text-xs"><Checkbox checked={checks.includes(item)} onCheckedChange={(checked) => setChecks((current) => checked ? [...current, item] : current.filter((value) => value !== item))} /><span>{item}</span></label>)}</div>
          <div className="mt-5 flex justify-end"><Button disabled={checks.length !== checklist.length} onClick={() => { setCount(3); setStage("countdown"); }}><Clock3 className="size-4" />Confirm Ready & Start Test</Button></div>
        </CardContent></Card>
      )}

      {stage === "countdown" && (
        <Card className="data-panel"><CardContent className="grid min-h-[320px] place-items-center p-6 text-center">
          <div><p className="label-kicker">Simulated synchronized cue</p><div className="numeric my-6 text-8xl font-semibold tracking-[-0.08em] text-primary">{count || <FlaskConical className="mx-auto size-20" />}</div><p className="text-xl font-semibold">{count ? "Prepare to request" : "Request Quote"}</p><p className="mt-3 text-xs text-muted-foreground">This countdown does not contact a real rideshare service.</p></div>
        </CardContent></Card>
      )}

      {stage === "form" && (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Card className="data-panel"><CardContent className="p-5">
            <div><p className="label-kicker">Step 2</p><h2 className="mt-2 text-lg font-semibold">Capture synthetic quote</h2></div>
            {Object.keys(form.formState.errors).length > 0 && <div role="alert" className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200">Review the fields marked below before submitting.</div>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Displayed price" type="number" step="0.01" error={form.formState.errors.displayedPrice?.message} {...form.register("displayedPrice", { valueAsNumber: true })} />
              <Field label="Currency" error={form.formState.errors.currency?.message} {...form.register("currency")} />
              <Field label="Exact quote timestamp (ET)" type="datetime-local" step="0.001" error={form.formState.errors.quoteTimestamp?.message} {...form.register("quoteTimestamp")} />
              <Field label="Latitude" type="number" step="0.000001" error={form.formState.errors.latitude?.message} {...form.register("latitude", { valueAsNumber: true })} />
              <Field label="Longitude" type="number" step="0.000001" error={form.formState.errors.longitude?.message} {...form.register("longitude", { valueAsNumber: true })} />
              <Field label="Network type" error={form.formState.errors.networkType?.message} {...form.register("networkType")} />
              <Field label="Device type" error={form.formState.errors.deviceType?.message} {...form.register("deviceType")} />
              <Field label="Operating system" error={form.formState.errors.operatingSystem?.message} {...form.register("operatingSystem")} />
              <Field label="OS version" error={form.formState.errors.operatingSystemVersion?.message} {...form.register("operatingSystemVersion")} />
              <Field label="App version" error={form.formState.errors.appVersion?.message} {...form.register("appVersion")} />
              <Field label="Battery percentage" type="number" error={form.formState.errors.batteryPercentage?.message} {...form.register("batteryPercentage", { valueAsNumber: true })} />
              <Field label="Account profile" error={form.formState.errors.accountProfileCategory?.message} {...form.register("accountProfileCategory")} />
              <Field label="Membership status" error={form.formState.errors.membershipStatus?.message} {...form.register("membershipStatus")} />
              <Field label="Platform" error={form.formState.errors.platform?.message} {...form.register("platform")} />
              <Field label="Ride tier" error={form.formState.errors.rideTier?.message} {...form.register("rideTier")} />
              <Field label="Pickup" error={form.formState.errors.pickup?.message} className="lg:col-span-2" {...form.register("pickup")} />
              <Field label="Destination" error={form.formState.errors.destination?.message} {...form.register("destination")} />
            </div>
            <div className="mt-4"><Label htmlFor="notes">Submission notes</Label><Textarea id="notes" className="mt-1.5 min-h-24" {...form.register("notes")} /></div>
          </CardContent></Card>
          <Card className="data-panel"><CardContent className="p-5">
            <p className="label-kicker">Required local evidence</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><FilePicker icon={<FileImage className="size-4" />} label="Quote screenshot" accept="image/*" file={selectedFiles.screenshot} onFile={(file) => setSelectedFiles((current) => ({ ...current, screenshot: file }))} /><FilePicker icon={<Film className="size-4" />} label="Screen recording" accept="video/*" file={selectedFiles.recording} onFile={(file) => setSelectedFiles((current) => ({ ...current, recording: file }))} /></div><p className="mt-3 text-xs text-muted-foreground">{demoConfig.messages.localFiles}</p>
          </CardContent></Card>
          <div className="sticky bottom-3 flex flex-wrap justify-end gap-2 rounded-lg border border-border bg-background/90 p-3 shadow-xl backdrop-blur"><Button type="button" variant="ghost" onClick={() => form.reset()}>Reset Form</Button><Button type="button" variant="outline" onClick={save}><Save className="size-4" />Save Draft</Button><Button type="submit"><Send className="size-4" />Submit Test</Button></div>
        </form>
      )}

      {stage === "submitted" && <Card className="data-panel"><CardContent className="grid min-h-[280px] place-items-center p-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Check className="size-6" /></span><h2 className="mt-4 text-xl font-semibold">Synthetic submission recorded</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Tester A is marked submitted. The assignment is now awaiting the paired response before technical validation can be recalculated.</p><div className="mt-4"><StatusBadge status="awaiting_partner" /></div></div></CardContent></Card>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1.5 text-xs leading-5">{value}</p></div>; }
function Field({ label, error, className, ...props }: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
  const id = React.useId(); return <div className={className}><Label htmlFor={id}>{label}</Label><Input id={id} className="mt-1.5" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />{error && <p id={`${id}-error`} className="mt-1 text-xs text-red-300">{error}</p>}</div>;
}
function FilePicker({ icon, label, accept, file, onFile }: { icon: React.ReactNode; label: string; accept: string; file?: File; onFile: (file?: File) => void }) {
  const id = React.useId(); return <div className="rounded-md border border-dashed border-border bg-secondary/25 p-3"><Label htmlFor={id} className="flex items-center gap-2">{icon}{label}</Label><Input id={id} type="file" accept={accept} className="mt-3 file:text-foreground" onChange={(event) => onFile(event.target.files?.[0])} />{file && <p className="mt-2 truncate text-[10px] text-muted-foreground">{file.name} · {file.type || "Unknown type"} · {(file.size / 1024).toFixed(1)} KB</p>}</div>;
}

import React from "react";

