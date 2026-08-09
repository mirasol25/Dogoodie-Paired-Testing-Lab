"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2, LocateFixed, LoaderCircle, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { saveSubmissionDraftAction, submitObservationAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AssignmentSummary, AssignmentTesterSummary, EvidenceRow, SubmissionRow } from "@/lib/data/assignments";
import type { Study } from "@/lib/data/studies";
import { submissionDraftClientSchema } from "@/lib/validation/submission-schemas";
import { EvidenceUploader } from "@/components/paired-testing/assignments/evidence-uploader";
import type { ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

interface Values { displayedFare: string; quoteTimestamp: string; latitude: string; longitude: string; networkType: string; appVersion: string; batteryPercentage: string; notes: string }

export function TesterSubmissionForm({ study, assignment, ownSlot, submission, technicalProfile, evidence, timezone }: { study: Study; assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; submission: SubmissionRow | null; technicalProfile: Pick<SubmissionRow, "network_type" | "device_type" | "operating_system" | "operating_system_version" | "app_version"> | null; evidence: EvidenceRow[]; timezone: string }) {
  const router = useRouter();
  const [savingDraft, startSaveDraft] = useTransition();
  const [submittingObservation, startSubmitObservation] = useTransition();
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState(Boolean(submission));
  const [submissionId, setSubmissionId] = useState<string | null>(submission?.id ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [evidenceState, setEvidenceState] = useState({ requiredComplete: false, mismatched: false });
  const [values, setValues] = useState<Values>({
    displayedFare: submission?.displayed_fare?.toString() ?? "",
    quoteTimestamp: submission?.quote_timestamp ? formatInTimeZone(submission.quote_timestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : "",
    latitude: submission?.latitude?.toString() ?? "",
    longitude: submission?.longitude?.toString() ?? "",
    networkType: submission?.network_type ?? technicalProfile?.network_type ?? "",
    appVersion: submission?.app_version ?? technicalProfile?.app_version ?? "",
    batteryPercentage: submission?.battery_percentage?.toString() ?? "",
    notes: submission?.notes ?? "",
  });
  const update = (field: keyof Values, value: string) => { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); setSaved(false); };

  function useLocation() {
    if (!navigator.geolocation) return toast.error("Location access is not available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      update("latitude", position.coords.latitude.toFixed(6));
      update("longitude", position.coords.longitude.toFixed(6));
      setLocating(false);
    }, () => { setLocating(false); toast.error("The current location could not be read."); }, { enableHighAccuracy: true, timeout: 10_000 });
  }

  function applyOCR(result: ScreenshotValidationResult) {
    setValues((current) => ({
      ...current,
      displayedFare: result.fare ? result.fare.min.toFixed(2) : current.displayedFare,
      quoteTimestamp: result.quoteTime.resolvedTimestamp ? formatInTimeZone(result.quoteTime.resolvedTimestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : current.quoteTimestamp,
    }));
    setSaved(false);
  }

  const handleEvidenceState = useCallback((next: { requiredComplete: boolean; mismatched: boolean }) => setEvidenceState(next), []);

  function save() {
    const numberValue = (value: string) => value.trim() ? Number(value) : Number.NaN;
    const input = {
      assignmentId: assignment.id,
      latitude: numberValue(values.latitude), longitude: numberValue(values.longitude), networkType: values.networkType,
      appVersion: values.appVersion, batteryPercentage: numberValue(values.batteryPercentage), notes: values.notes,
    };
    const parsed = submissionDraftClientSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { next[String(issue.path[0])] ??= issue.message; });
      setErrors(next);
      return;
    }
    startSaveDraft(async () => {
      const result = await saveSubmissionDraftAction(parsed.data);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSaved(true);
      setSubmissionId(result.submissionId ?? submissionId);
      toast.success(result.message);
    });
  }

  function submit() {
    if (!submissionId || !saved || !evidenceState.requiredComplete || evidenceState.mismatched) return;
    startSubmitObservation(async () => {
      const result = await submitObservationAction(assignment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return <section className="space-y-5 border-t border-border pt-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-muted-foreground">Tester submission</p><h2 className="mt-1.5 text-base font-semibold">Capture quote observation</h2><p className="mt-1 text-xs text-muted-foreground">{ownSlot.platformName} - {ownSlot.serviceName} / {assignment.pickup_location} to {assignment.destination_location}</p></div>{saved ? <span className="text-xs font-medium text-primary">Draft saved</span> : null}</div>
    <EvidenceUploader assignment={assignment} ownSlot={ownSlot} submissionId={submissionId} observationSaved={saved} initialEvidence={evidence} onOCRResult={applyOCR} onEvidenceStateChange={handleEvidenceState} showFinalSubmission={false} />
    {!submission && technicalProfile ? <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary/[0.025] px-4 py-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-xs font-medium">Saved device profile applied</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Confirm the network and ride-hailing app version for this session. Change either value when you switched connections or the app was updated.</p></div></div> : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label={`Screenshot fare (${study.default_currency ?? "Currency"})`} value={values.displayedFare} onChange={() => undefined} type="number" step="0.01" readOnly placeholder="Confirm screenshot boxes first" /><Field label={`Screenshot timestamp (${timezone})`} value={values.quoteTimestamp} onChange={() => undefined} type="datetime-local" step="1" readOnly placeholder="Confirm screenshot boxes first" /><Field label="Battery percentage" value={values.batteryPercentage} onChange={(value) => update("batteryPercentage", value)} type="number" min="0" max="100" step="1" placeholder="Enter 0 to 100" error={errors.batteryPercentage} /><Field label="Latitude" value={values.latitude} onChange={(value) => update("latitude", value)} type="number" step="0.000001" error={errors.latitude} /><Field label="Longitude" value={values.longitude} onChange={(value) => update("longitude", value)} type="number" step="0.000001" error={errors.longitude} /><div className="flex items-start pt-8"><Button type="button" className="w-full" variant="outline" onClick={useLocation} disabled={locating}><LocateFixed className="size-4" />{locating ? "Locating..." : "Use current location"}</Button></div><ChoiceField label="Network used for this session" value={values.networkType} onChange={(value) => update("networkType", value)} options={["Wi-Fi", "4G/LTE", "5G"]} error={errors.networkType} /><Field label={`${ownSlot.platformName} app version`} value={values.appVersion} onChange={(value) => update("appVersion", value)} placeholder="For example, 5.355.0" error={errors.appVersion} /></div>
    <div className="space-y-2"><Label htmlFor="submission-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="submission-notes" rows={3} maxLength={1000} value={values.notes} onChange={(event) => update("notes", event.target.value)} /></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Save your changes before final submission.</p><Button onClick={save} disabled={savingDraft || submittingObservation}>{savingDraft ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{savingDraft ? "Saving..." : "Save draft"}</Button></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div><p className="text-xs font-medium">Final submission</p><p className="mt-1 text-xs text-muted-foreground">{evidenceState.mismatched ? "A replacement screenshot is required." : !saved ? "Save the latest observation changes first." : !evidenceState.requiredComplete ? "Upload all required evidence to continue." : "Observation and required evidence are complete."}</p></div><Button onClick={submit} disabled={!submissionId || !saved || !evidenceState.requiredComplete || evidenceState.mismatched || savingDraft || submittingObservation}>{submittingObservation ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{submittingObservation ? "Submitting..." : "Submit observation"}</Button></div>
  </section>;
}

function Field({ label, value, onChange, error, action, ...props }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void; error?: string; action?: React.ReactNode }) {
  const id = `submission-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="min-w-0 space-y-2"><div className="flex min-h-8 items-center justify-between gap-2"><Label htmlFor={id}>{label}</Label>{action}</div><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} {...props} />{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}

function ChoiceField({ label, value, onChange, options, error }: { label: string; value: string; onChange: (value: string) => void; options: string[]; error?: string }) {
  const id = `submission-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="min-w-0 space-y-2"><div className="flex min-h-8 items-center"><Label htmlFor={id}>{label}</Label></div><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}><SelectValue placeholder="Select network" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}
