"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Check, CheckCircle2, Circle, FileImage, Film, LocateFixed, LoaderCircle, LockKeyhole, PlayCircle, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { completeCaptureChecklistAction, saveSubmissionDraftAction, submitObservationAction, validateCurrentLocationAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AssignmentRouteGuidance, AssignmentSummary, AssignmentTesterSummary, EvidenceRow, SubmissionRow, TesterWorkflowState } from "@/lib/data/assignments";
import type { Study } from "@/lib/data/studies";
import { submissionDraftClientSchema } from "@/lib/validation/submission-schemas";
import { EvidenceUploader } from "@/components/paired-testing/assignments/evidence-uploader";
import type { ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

interface Values { displayedFare: string; quoteTimestamp: string; latitude: string; longitude: string; networkType: string; appVersion: string; batteryPercentage: string; notes: string }

function storedDraftIsComplete(submission: SubmissionRow | null) {
  return Boolean(submission?.displayed_fare !== null && submission?.quote_timestamp && submission.latitude !== null && submission.longitude !== null
  );
}

type ProtocolObservationField = { code: string; label: string; required: boolean; source: string };

const observationFieldLabels: Record<string, string> = {
  estimated_arrival_time: "Estimated arrival time",
  availability: "Ride availability",
  price_breakdown: "Price breakdown",
  tester_notes: "Tester notes",
  app_version: "App version",
  battery_percentage: "Battery percentage",
  network_category: "Network category",
};

export function TesterSubmissionForm({ study, assignment, ownSlot, submission, technicalProfile, evidence, initialScreenshotValidation, screenshotPreviewUrl, timezone, workflow, partnerName, routeGuidance, protocolObservationFields }: { study: Study; assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; submission: SubmissionRow | null; technicalProfile: Pick<SubmissionRow, "device_type" | "operating_system" | "operating_system_version" | "app_version"> | null; evidence: EvidenceRow[]; initialScreenshotValidation: ScreenshotValidationResult | null; screenshotPreviewUrl: string; timezone: string; workflow: TesterWorkflowState; partnerName: string; routeGuidance: AssignmentRouteGuidance | null; protocolObservationFields: ProtocolObservationField[] }) {
  const router = useRouter();
  const [savingDraft, startSaveDraft] = useTransition();
  const [submittingObservation, startSubmitObservation] = useTransition();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [pickupDistance, setPickupDistance] = useState<number | null>(null);
  const [pickupStatus, setPickupStatus] = useState<"pass" | "warning" | "fail" | null>(null);
  const [saved, setSaved] = useState(() => storedDraftIsComplete(submission));
  const [submissionId, setSubmissionId] = useState<string | null>(submission?.id ?? null);
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [observationData, setObservationData] = useState<Record<string, string>>(() => {
    const value = submission?.observation_data;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce<Record<string, string>>((acc, [key, raw]) => {
      if (typeof raw === "string") acc[key] = raw;
      return acc;
    }, {});
  });
  const [evidenceState, setEvidenceState] = useState({ requiredComplete: workflow.ownEvidenceReady, mismatched: false });
  const [values, setValues] = useState<Values>({
    displayedFare: submission?.displayed_fare?.toString() ?? (initialScreenshotValidation?.selectionStatus === "confirmed" && initialScreenshotValidation.fare ? initialScreenshotValidation.fare.min.toFixed(2) : ""),
    quoteTimestamp: submission?.quote_timestamp ? formatInTimeZone(submission.quote_timestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : initialScreenshotValidation?.selectionStatus === "confirmed" && initialScreenshotValidation.quoteTime.resolvedTimestamp ? formatInTimeZone(initialScreenshotValidation.quoteTime.resolvedTimestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : "",
    latitude: submission?.latitude?.toString() ?? "",
    longitude: submission?.longitude?.toString() ?? "",
    networkType: submission?.network_type ?? "",
    appVersion: submission?.app_version ?? technicalProfile?.app_version ?? "",
    batteryPercentage: submission?.battery_percentage?.toString() ?? (initialScreenshotValidation?.selectionStatus === "confirmed" && initialScreenshotValidation.batteryPercentage !== null ? String(initialScreenshotValidation.batteryPercentage) : ""),
    notes: submission?.notes ?? "",
  });
  const update = (field: keyof Values, value: string) => { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); setSaved(false); };
  const updateObservation = (code: string, value: string) => { setObservationData((current) => ({ ...current, [code]: value })); setSaved(false); };
  const requiredObservationFields = protocolObservationFields.filter((field) => field.required);
  const hasProtocolField = (code: string) => protocolObservationFields.some((field) => field.code === code);
  const observationErrors = errors as Record<string, string>;

  function captureCurrentLocation() {
    if (!window.isSecureContext) {
      const message = "Location requires a secure HTTPS connection. Open the deployed HTTPS site and try again.";
      setLocationError(message);
      return toast.error(message);
    }
    if (!navigator.geolocation) {
      const message = "Location access is not available in this browser or app.";
      setLocationError(message);
      return toast.error(message);
    }
    setLocationError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      const proximity = await validateCurrentLocationAction(assignment.id, latitude, longitude);
      if (!proximity.ok) {
        setLocating(false);
        setLocationError(proximity.message);
        toast.error(proximity.message);
        return;
      }
      update("latitude", position.coords.latitude.toFixed(6));
      update("longitude", position.coords.longitude.toFixed(6));
      setLocationAccuracy(Math.round(position.coords.accuracy));
      setPickupDistance(proximity.result.distance_feet);
      setPickupStatus(proximity.result.status);
      setLocating(false);
      if (proximity.result.status === "fail") toast.warning("Location captured outside the pickup threshold. You may submit, but expert review will be required.");
      else if (proximity.result.status === "warning") toast.warning("Location captured near the pickup threshold boundary.");
      else toast.success("Current location captured at the assigned pickup.");
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. Allow location for this site in your phone settings, then try again."
        : error.code === error.POSITION_UNAVAILABLE
          ? "Your phone could not determine its current location. Turn on Location Services and try again."
          : "Location timed out. Move to an area with a clearer GPS signal and try again.";
      setLocating(false);
      setLocationError(message);
      toast.error(message);
    }, { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  }

  function applyOCR(result: ScreenshotValidationResult) {
    setValues((current) => ({
      ...current,
      displayedFare: result.fare ? result.fare.min.toFixed(2) : current.displayedFare,
      quoteTimestamp: result.quoteTime.resolvedTimestamp ? formatInTimeZone(result.quoteTime.resolvedTimestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : current.quoteTimestamp,
      batteryPercentage: result.batteryPercentage !== null ? String(result.batteryPercentage) : current.batteryPercentage,
    }));
    setSaved(false);
  }

  const handleEvidenceState = useCallback((next: { requiredComplete: boolean; mismatched: boolean }) => {
    setEvidenceState(next);
    if (next.requiredComplete && !next.mismatched) router.refresh();
  }, [router]);

  useEffect(() => {
    if (!workflow.ownEvidenceReady || workflow.bothEvidenceReady) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [router, workflow.bothEvidenceReady, workflow.ownEvidenceReady]);

  function save() {
    const numberValue = (value: string) => value.trim() ? Number(value) : Number.NaN;
    const input = {
      assignmentId: assignment.id,
      latitude: numberValue(values.latitude), longitude: numberValue(values.longitude),
      networkType: hasProtocolField("network_category") ? values.networkType : null,
      appVersion: hasProtocolField("app_version") ? values.appVersion : null,
      batteryPercentage: hasProtocolField("battery_percentage") && values.batteryPercentage.trim() ? numberValue(values.batteryPercentage) : null,
      notes: values.notes,
      observationData,
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
    if (!submissionId || !saved || !detailsComplete || !evidenceState.requiredComplete || evidenceState.mismatched) return;
    startSubmitObservation(async () => {
      const result = await submitObservationAction(assignment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSubmitReviewOpen(false);
      router.refresh();
    });
  }

  const appVersionHint = technicalProfile?.operating_system?.toLowerCase() === "ios"
    ? `Open the App Store, search for ${ownSlot.platformName ?? "the ride-hailing app"}, open its page, and check the version under What's New or Version History.`
    : technicalProfile?.operating_system?.toLowerCase() === "android"
      ? `Open Google Play, search for ${ownSlot.platformName ?? "the ride-hailing app"}, open its page, then check About this app > App info > Version.`
      : `Find the current version on the app's App Store or Google Play page.`;
  const detailsComplete = Boolean(
    values.displayedFare &&
    values.quoteTimestamp &&
    values.latitude &&
    values.longitude &&
    requiredObservationFields.every((field) => {
      if (field.code === "tester_notes") return values.notes.trim().length > 0;
      if (field.code === "battery_percentage") return values.batteryPercentage.trim().length > 0;
      if (field.code === "network_category") return values.networkType.trim().length > 0;
      if (field.code === "app_version") return values.appVersion.trim().length > 0;
      return (observationData[field.code] ?? "").trim().length > 0;
    })
  );
  const batteryRequired = requiredObservationFields.some((field) => field.code === "battery_percentage");
  const batteryReady = !batteryRequired || values.batteryPercentage.trim().length > 0;
  const submissionReady = Boolean(submissionId && saved && detailsComplete && evidenceState.requiredComplete && !evidenceState.mismatched);

  if (!workflow.captureAcknowledged) return <CaptureChecklist assignment={assignment} ownSlot={ownSlot} routeGuidance={routeGuidance} />;

  if (!workflow.bothEvidenceReady) return <section className="space-y-5 border-t border-border pt-6">
    <AssignmentCaptureSummary assignment={assignment} ownSlot={ownSlot} />
    <div><p className="text-[10px] uppercase text-primary">Capture & upload</p><h2 className="mt-1.5 text-lg font-semibold">Required evidence</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Upload the screenshot and screen recording you captured together.</p></div>
    {workflow.ownEvidenceReady ? <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="text-sm font-semibold">Your evidence is complete</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Your screenshot was validated and your screen recording was saved successfully.</p><p className="mt-3 text-xs font-medium text-primary">Waiting for {partnerName}&apos;s evidence...</p></div></div></div> : <EvidenceUploader assignment={assignment} ownSlot={ownSlot} submissionId={submissionId} observationSaved={saved} initialEvidence={evidence} initialValidation={initialScreenshotValidation} initialScreenshotUrl={screenshotPreviewUrl} onOCRResult={applyOCR} onEvidenceStateChange={handleEvidenceState} showFinalSubmission={false} />}
  </section>;

  return <section className="space-y-6 border-t border-border pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-muted-foreground">Observation details</p><h2 className="mt-1.5 text-lg font-semibold">Complete your quote observation</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Both evidence sets are ready. Complete your remaining details and submit independently.</p></div>{saved ? <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"><Check className="size-3.5" />Draft saved</span> : <span className="rounded-full border border-amber-400/30 bg-amber-400/5 px-2.5 py-1 text-xs font-medium text-amber-200">Unsaved changes</span>}</div>
    <div className="border-t border-border pt-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-muted-foreground">Step 3 of 5</p><h2 className="mt-1.5 text-base font-semibold">Complete session details</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Confirm the locked screenshot values, capture your current location, then enter the technical details used for this observation.</p></div>{detailsComplete ? <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" aria-label="Session details complete" /> : null}</div></div>
    <div className="space-y-6"><fieldset><legend className="mb-3 text-xs font-semibold">From the confirmed screenshot</legend><div className="grid gap-4 sm:grid-cols-2"><Field label={`Fare (${study.default_currency ?? "Currency"})`} value={values.displayedFare} onChange={() => undefined} type="number" step="0.01" readOnly placeholder="Confirm screenshot boxes first" /><Field label={`Quote timestamp (${timezone})`} value={values.quoteTimestamp} onChange={() => undefined} type="datetime-local" step="1" readOnly placeholder="Confirm screenshot boxes first" /></div></fieldset><fieldset className="border-t border-border pt-5"><legend className="px-1 text-xs font-semibold">Current session location</legend><div className="mt-3 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"><Field label="Latitude" value={values.latitude} onChange={() => undefined} type="number" step="0.000001" readOnly error={errors.latitude} /><Field label="Longitude" value={values.longitude} onChange={() => undefined} type="number" step="0.000001" readOnly error={errors.longitude} /><div className="flex items-end"><Button type="button" className="w-full sm:w-auto" variant="outline" onClick={captureCurrentLocation} disabled={locating}>{locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}{locating ? "Validating location..." : values.latitude && values.longitude ? "Refresh location" : "Use current location"}</Button></div></div>{values.latitude && values.longitude ? <p className={`mt-2 text-xs ${pickupStatus === "fail" ? "text-red-300" : pickupStatus === "warning" ? "text-amber-200" : "text-primary"}`}>Device location captured{pickupDistance !== null ? ` - ${pickupDistance} feet from the assigned pickup pin` : ""}{locationAccuracy !== null ? ` (approximately ${locationAccuracy} m GPS accuracy)` : ""}. {pickupStatus === "fail" ? "Outside the protocol threshold; submission is allowed and the reviewer will decide its disposition." : pickupStatus === "warning" ? "Near the protocol boundary; this will be retained for technical review." : "Within the pickup threshold."}</p> : <p className="mt-2 text-xs text-muted-foreground">Tap Use current location when you are physically at the assigned pickup. Coordinates cannot be entered manually.</p>}{locationError ? <p className="mt-2 text-xs leading-5 text-red-300">{locationError}</p> : null}</fieldset>{protocolObservationFields.length ? <fieldset className="border-t border-border pt-5"><legend className="px-1 text-xs font-semibold">Protocol observation fields</legend><div className="mt-3 grid gap-4 lg:grid-cols-2">{protocolObservationFields.map((field) => {
      const label = observationFieldLabels[field.code] ?? field.label;
      const required = field.required;
      if (field.code === "tester_notes") {
        return <div key={field.code} className="lg:col-span-2 space-y-2"><Label htmlFor={`submission-observation-${field.code}`}>{label} {required ? <span className="text-primary">*</span> : <span className="font-normal text-muted-foreground">(optional)</span>}</Label><Textarea id={`submission-observation-${field.code}`} rows={3} maxLength={1000} value={values.notes} onChange={(event) => update("notes", event.target.value)} aria-invalid={Boolean(observationErrors[field.code])} />{observationErrors[field.code] ? <p className="text-xs text-red-300">{observationErrors[field.code]}</p> : null}</div>;
      }
      if (field.code === "battery_percentage") {
        return <Field key={field.code} label={`${label}${required ? " *" : ""}`} value={values.batteryPercentage} onChange={(value) => update("batteryPercentage", value)} type="number" min="0" max="100" step="1" placeholder="0 to 100" error={observationErrors[field.code] ?? errors.batteryPercentage} />;
      }
      if (field.code === "network_category") {
        return <ChoiceField key={field.code} label={`${label}${required ? " *" : ""}`} value={values.networkType} onChange={(value) => update("networkType", value)} options={["Wi-Fi", "4G/LTE", "5G"]} error={observationErrors[field.code] ?? errors.networkType} />;
      }
      if (field.code === "app_version") {
        return <Field key={field.code} label={`${label}${required ? " *" : ""}`} value={values.appVersion} onChange={(value) => update("appVersion", value)} placeholder="For example, 5.355.0" hint={appVersionHint} error={observationErrors[field.code] ?? errors.appVersion} />;
      }
      if (field.code === "estimated_arrival_time") {
        return <Field key={field.code} label={`${label}${required ? " *" : ""}`} value={observationData[field.code] ?? ""} onChange={(value) => updateObservation(field.code, value)} type="time" step="60" error={observationErrors[field.code]} />;
      }
      return <Field key={field.code} label={`${label}${required ? " *" : ""}`} value={observationData[field.code] ?? ""} onChange={(value) => updateObservation(field.code, value)} placeholder={required ? `Enter ${label.toLowerCase()}` : `Optional ${label.toLowerCase()}`} error={observationErrors[field.code]} />;
    })}</div></fieldset> : null}</div>
    <div className="space-y-2">{protocolObservationFields.some((field) => field.code === "tester_notes") ? null : <><Label htmlFor="submission-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="submission-notes" rows={3} maxLength={1000} value={values.notes} onChange={(event) => update("notes", event.target.value)} /></>}</div>
    <div className="border-t border-border pt-5"><div className="grid gap-4 lg:grid-cols-[1fr_auto]"><div><p className="text-[10px] uppercase text-muted-foreground">Steps 4 and 5</p><h2 className="mt-1.5 text-sm font-semibold">Save, review, and submit</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"><Requirement complete={evidenceState.requiredComplete && !evidenceState.mismatched} label="Evidence confirmed" /><Requirement complete={detailsComplete && batteryReady} label="Session details complete" /><Requirement complete={saved} label="Latest changes saved" /></div><p className={`mt-3 text-xs leading-5 ${submissionReady ? "text-primary" : "text-muted-foreground"}`}>{evidenceState.mismatched ? "The screenshot does not match the assigned ride. Replace and confirm it before submitting." : !batteryReady ? "Add the battery percentage only if the protocol requires it." : !detailsComplete ? "Complete all required session details before saving." : !saved ? "Save the latest details before final submission." : !evidenceState.requiredComplete ? "Upload and confirm all required evidence before submitting." : "Ready for final review. Submission will lock this observation."}</p></div><div className="flex flex-col gap-2 sm:flex-row lg:items-end"><Button variant="outline" onClick={save} disabled={savingDraft || submittingObservation}>{savingDraft ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{savingDraft ? "Saving..." : saved ? "Save again" : "Save draft"}</Button><Button onClick={() => setSubmitReviewOpen(true)} disabled={!submissionReady || savingDraft || submittingObservation}><Send className="size-4" />Review and submit</Button></div></div></div>
    <Dialog open={submitReviewOpen} onOpenChange={submittingObservation ? undefined : setSubmitReviewOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Submit and lock this observation?</DialogTitle><DialogDescription>After submission, you cannot edit the form or replace its evidence unless an authorized reviewer reopens it.</DialogDescription></DialogHeader><div className="rounded-md border border-border p-3 text-xs leading-5"><p className="font-semibold">Before continuing, confirm that:</p><ul className="mt-2 space-y-1 text-muted-foreground"><li>- The selected ride and fare are correct.</li><li>- The full screen recording is uploaded.</li><li>- Your current location and any protocol-requested fields are accurate.</li><li>- The latest draft is saved.</li></ul></div><DialogFooter><Button variant="outline" onClick={() => setSubmitReviewOpen(false)} disabled={submittingObservation}>Go back and review</Button><Button onClick={submit} disabled={submittingObservation}>{submittingObservation ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{submittingObservation ? "Submitting..." : "Submit and lock"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function CaptureChecklist({ assignment, ownSlot, routeGuidance }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; routeGuidance: AssignmentRouteGuidance | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [videoOpen, setVideoOpen] = useState(false);
  const items = [
    `I entered ${assignment.pickup_location} as pickup and ${assignment.destination_location} as destination.`,
    `I selected ${ownSlot.platformName ?? "the assigned provider"} - ${ownSlot.serviceName ?? "the assigned ride tier"}.`,
    "I started screen recording before requesting the quote.",
    "The displayed fare and device time are visible.",
    "I captured the full-screen quote screenshot.",
    "I stopped and saved the screen recording.",
  ];
  const captureSteps = [
    { title: "Start screen recording", detail: "Turn on your phone's screen recorder before opening the provider app." },
    { title: `Open ${ownSlot.platformName ?? "the provider app"}`, detail: `Use the same account and device prepared for this assignment.` },
    {
      title: "Enter the assigned route",
      detail: `${assignment.pickup_location} to ${assignment.destination_location}.`,
      notes: [
        { label: "Pickup note", value: routeGuidance?.pickupInstructions },
        { label: "Destination note", value: routeGuidance?.destinationInstructions },
      ].filter((note): note is { label: string; value: string } => Boolean(note.value)),
    },
    { title: "Select the assigned service", detail: `${ownSlot.serviceName ?? "Use the ride tier shown above"}. Do not select another tier.` },
    { title: "Capture the quote", detail: "Wait for the fare to load, then take a full-screen screenshot showing the selected tier, fare, and device time." },
    { title: "Save the recording", detail: "Stop the screen recording after the screenshot and confirm both files are saved on your phone." },
  ];
  const [checked, setChecked] = useState<number[]>([]);
  const complete = checked.length === items.length;

  function unlockUploads() {
    if (!complete) return;
    startTransition(async () => {
      const result = await completeCaptureChecklistAction(assignment.id);
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message);
      router.refresh();
    });
  }

  return <section className="space-y-5 border-t border-border pt-6">
    <AssignmentCaptureSummary assignment={assignment} ownSlot={ownSlot} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase text-primary">Capture & upload</p><h2 className="mt-1.5 text-lg font-semibold">Capture the assigned quote</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Follow these steps with your partner before uploading evidence.</p></div><Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setVideoOpen(true)}><PlayCircle className="size-4" />Watch video tutorial</Button></div>
    <Dialog open={videoOpen} onOpenChange={setVideoOpen}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Capture and upload tutorial</DialogTitle><DialogDescription>Watch the complete capture procedure, then follow the assigned route and service shown on this page.</DialogDescription></DialogHeader><div className="overflow-hidden rounded-md border border-border bg-black"><video className="max-h-[72vh] w-full" controls playsInline preload="metadata"><source src="/tutorials/capture-evidence-guide.mp4" type="video/mp4" />Your browser does not support this tutorial video.</video></div><p className="text-xs leading-5 text-muted-foreground">The assignment values on this page are authoritative. If the example in the video uses a different route or ride tier, use your assigned values.</p></DialogContent></Dialog>
    <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">{captureSteps.map((step, index) => <li key={step.title} className="flex gap-3 bg-background p-4"><span className="numeric grid size-6 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-[11px] font-semibold text-primary">{index + 1}</span><div className="min-w-0"><p className="text-sm font-semibold">{step.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>{"notes" in step && step.notes?.length ? <dl className="mt-3 space-y-2 border-t border-border pt-3">{step.notes.map((note) => <div key={note.label}><dt className="text-[9px] uppercase text-primary">{note.label}</dt><dd className="mt-0.5 text-[11px] leading-4 text-foreground">{note.value}</dd></div>)}</dl> : null}</div></li>)}</ol>
    <div><h3 className="text-sm font-semibold">Confirm before uploading</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Check each item after completing the instructions. Both upload controls unlock when all items are confirmed.</p></div>
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">{items.map((item, index) => { const selected = checked.includes(index); return <label key={item} className={`flex min-h-14 cursor-pointer items-start gap-3 px-4 py-4 text-sm leading-6 ${selected ? "bg-primary/[0.055]" : "hover:bg-secondary/25"}`}><Checkbox className="mt-0.5" checked={selected} onCheckedChange={(value) => setChecked((current) => value === true ? [...current, index] : current.filter((entry) => entry !== index))} /><span className={selected ? "text-foreground" : "text-muted-foreground"}>{item}</span></label>; })}</div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="flex items-center gap-3 rounded-md border border-border p-4"><FileImage className="size-4 text-muted-foreground" /><div><p className="text-sm font-medium">Quote screenshot</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3" />Locked until checklist completion</p></div></div><div className="flex items-center gap-3 rounded-md border border-border p-4"><Film className="size-4 text-muted-foreground" /><div><p className="text-sm font-medium">Screen recording</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3" />Locked until checklist completion</p></div></div></div>
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card/30 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{complete ? "Capture procedure confirmed. Unlock the evidence uploads." : `${items.length - checked.length} item${items.length - checked.length === 1 ? "" : "s"} remaining.`}</p><Button className="w-full sm:w-auto" onClick={unlockUploads} disabled={!complete || pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Unlocking..." : "Unlock evidence upload"}</Button></div>
  </section>;
}

function AssignmentCaptureSummary({ assignment, ownSlot }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary }) {
  return <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2"><div className="bg-background p-4"><p className="text-[10px] uppercase text-muted-foreground">Route</p><p className="mt-2 text-sm font-semibold">{assignment.pickup_location} <span className="text-primary">to</span> {assignment.destination_location}</p></div><div className="bg-background p-4"><p className="text-[10px] uppercase text-muted-foreground">Your assigned service</p><p className="mt-2 text-sm font-semibold">{ownSlot.platformName ?? "Assigned provider"} - {ownSlot.serviceName ?? "Assigned ride tier"}</p></div></div>;
}

function Requirement({ complete, label }: { complete: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-1.5 ${complete ? "text-primary" : "text-muted-foreground"}`}>{complete ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}{label}</span>;
}

function Field({ label, value, onChange, error, action, hint, ...props }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void; error?: string; action?: React.ReactNode; hint?: string }) {
  const id = `submission-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="min-w-0 space-y-2"><div className="flex min-h-8 items-center justify-between gap-2"><Label htmlFor={id}>{label}</Label>{action}</div><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} {...props} />{hint ? <p className="text-[10px] leading-4 text-muted-foreground">{hint}</p> : null}{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}

function ChoiceField({ label, value, onChange, options, error }: { label: string; value: string; onChange: (value: string) => void; options: string[]; error?: string }) {
  const id = `submission-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="min-w-0 space-y-2"><div className="flex min-h-8 items-center"><Label htmlFor={id}>{label}</Label></div><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}><SelectValue placeholder="Select network" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}
