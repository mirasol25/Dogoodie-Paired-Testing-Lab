"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, FileImage, FileJson, Film, LoaderCircle, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { ensureScreenshotDraftAction, registerEvidenceAction, submitObservationAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { ScreenshotCandidateModal } from "@/components/paired-testing/assignments/screenshot-candidate-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AssignmentSummary, AssignmentTesterSummary, EvidenceRow } from "@/lib/data/assignments";
import { createClient } from "@/lib/supabase/client";
import type { ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

type UploadType = "screenshot" | "screen_recording";
interface Requirement { code: UploadType; label: string; required: boolean }

function configuredRequirements(assignment: AssignmentSummary): Requirement[] {
  if (!Array.isArray(assignment.protocolEvidenceRequirements)) return [];
  return assignment.protocolEvidenceRequirements.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.code !== "string" || typeof item.label !== "string") return [];
    if (!["screenshot", "screen_recording"].includes(item.code)) return [];
    return [{ code: item.code as UploadType, label: item.label, required: item.required === true }];
  });
}

const accepts: Record<UploadType, string> = { screenshot: "image/jpeg,image/png,image/webp", screen_recording: "video/mp4,video/quicktime" };
const icons = { screenshot: FileImage, screen_recording: Film };
const screenshotGuides: Record<string, { image: string; title: string }> = {
  grab: { image: "/screenshot-guides/grab-selected-ride.png", title: "Grab quote example" },
  uber: { image: "/screenshot-guides/uber-selected-ride.jpg", title: "Uber quote example" },
};

function ScreenshotCaptureGuide({ platformName, serviceName }: { platformName: string | null; serviceName: string | null }) {
  const guide = screenshotGuides[platformName?.toLowerCase() ?? ""];
  const [exampleOpen, setExampleOpen] = useState(false);
  return <><aside className="rounded-md border border-primary/25 bg-primary/[0.035] p-3"><div className="flex gap-3">
    {guide ? <button type="button" onClick={() => setExampleOpen(true)} className="relative hidden h-40 w-20 shrink-0 overflow-hidden rounded border border-border bg-background sm:block" aria-label={`View ${guide.title.toLowerCase()}`}><Image src={guide.image} alt="" fill sizes="80px" className="object-cover object-bottom" /></button> : null}
    <div className="min-w-0"><div className="flex items-center gap-2"><CircleAlert className="size-4 text-primary" /><p className="text-xs font-semibold">{guide?.title ?? "Quote screenshot checklist"}</p></div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Capture the whole phone screen—do not crop, blur, or cover the status bar. Expected service: <span className="font-medium text-foreground">{serviceName ?? "assigned ride"}</span>.</p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground"><li>- Keep the selected ride card and its fare visible.</li><li>- Keep the phone time visible in the status bar.</li><li>- Do not cover the screen with notifications or floating controls.</li><li>- After upload, select the correct detected boxes.</li></ul>
      {guide ? <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setExampleOpen(true)}>View screenshot example</Button> : null}
    </div>
  </div></aside>{guide ? <Dialog open={exampleOpen} onOpenChange={setExampleOpen}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{guide.title}</DialogTitle><DialogDescription>Use this as a framing guide. Your screenshot must show your assigned ride tier and actual quote.</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]"><div className="flex max-h-[72vh] justify-center overflow-auto rounded-md border border-border bg-black/30 p-2"><Image src={guide.image} alt={`${guide.title} showing a full-screen quote`} width={900} height={2000} className="h-auto max-h-none w-full max-w-md object-contain" /></div><div className="space-y-3 rounded-md border border-border p-4 text-xs leading-5"><p className="font-semibold">Your screenshot must show:</p><ul className="space-y-2 text-muted-foreground"><li>1. The complete phone screen.</li><li>2. The assigned ride card visibly selected.</li><li>3. The fare inside that selected card.</li><li>4. The phone time in the status bar.</li></ul><p className="border-t border-border pt-3 text-muted-foreground">Battery is entered manually in the form and does not need to be readable in the screenshot.</p><Button className="w-full" onClick={() => setExampleOpen(false)}>Close example</Button></div></div></DialogContent></Dialog> : null}</>;
}

async function sha256(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function safeFilename(name: string) { return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-160) || "evidence-file"; }

export function EvidenceUploader({ assignment, ownSlot, submissionId, observationSaved, initialEvidence, initialValidation = null, initialScreenshotUrl = "", onOCRResult, onEvidenceStateChange, showFinalSubmission = true }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; submissionId: string | null; observationSaved: boolean; initialEvidence: EvidenceRow[]; initialValidation?: ScreenshotValidationResult | null; initialScreenshotUrl?: string; onOCRResult?: (result: ScreenshotValidationResult) => void; onEvidenceStateChange?: (state: { requiredComplete: boolean; mismatched: boolean }) => void; showFinalSubmission?: boolean }) {
  const router = useRouter();
  const [submitting, startSubmission] = useTransition();
  const requirements = configuredRequirements(assignment);
  const [uploadedTypes, setUploadedTypes] = useState(() => initialEvidence.map((item) => item.evidence_type));
  const [files, setFiles] = useState<Partial<Record<UploadType, File>>>({});
  const [uploading, setUploading] = useState<UploadType | null>(null);
  const [draftId, setDraftId] = useState<string | null>(submissionId);
  const [validation, setValidation] = useState<ScreenshotValidationResult | null>(initialValidation);
  const [ocrEvidenceId, setOcrEvidenceId] = useState<string | null>(() => initialEvidence.filter((item) => item.evidence_type === "screenshot").at(-1)?.id ?? null);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "queued" | "processing" | "completed" | "failed">(initialValidation ? "completed" : initialEvidence.some((item) => item.evidence_type === "screenshot") ? "queued" : "idle");
  const [ocrError, setOcrError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(initialScreenshotUrl);
  const screenshotUrlRef = useRef("");
  useEffect(() => () => { if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current); }, []);
  useEffect(() => {
    if (!ocrEvidenceId || !["queued", "processing"].includes(ocrStatus)) return;
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(`/api/screenshot-ocr/${ocrEvidenceId}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const job = await response.json() as { status: "queued" | "processing" | "completed" | "failed"; last_error?: string | null; validation?: ScreenshotValidationResult | null };
        setOcrStatus(job.status);
        setOcrError(job.last_error ?? "");
        if (job.status === "completed" && job.validation) {
          setValidation(job.validation);
          setReviewOpen(job.validation.selectionStatus === "pending");
          toast.success("OCR candidates are ready. Select the correct boxes.");
        }
        else if (job.status === "queued") void fetch(`/api/screenshot-ocr/${ocrEvidenceId}`, { method: "POST" });
      } catch { /* The persisted job remains available for the next poll. */ }
    };
    void check();
    const timer = window.setInterval(() => void check(), 4000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [ocrEvidenceId, ocrStatus, router]);
  function chooseFile(type: UploadType, file?: File) {
    setFiles((current) => ({ ...current, [type]: file }));
    if (type === "screenshot") {
      if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
      const url = file ? URL.createObjectURL(file) : "";
      screenshotUrlRef.current = url;
      setScreenshotUrl(url);
    }
  }
  const requiredComplete = requirements.filter((item) => item.required).every((item) => uploadedTypes.includes(item.code) && (item.code !== "screenshot" || validation?.selectionStatus === "confirmed"));
  useEffect(() => { onEvidenceStateChange?.({ requiredComplete, mismatched: validation?.serviceValidation === "mismatched" }); }, [onEvidenceStateChange, requiredComplete, validation?.serviceValidation]);

  async function upload(requirement: Requirement) {
    const file = files[requirement.code];
    let activeSubmissionId = submissionId ?? draftId;
    if (!activeSubmissionId && requirement.code === "screenshot") {
      const draft = await ensureScreenshotDraftAction(assignment.id);
      if (!draft.ok || !draft.submissionId) return toast.error(draft.message);
      activeSubmissionId = draft.submissionId; setDraftId(activeSubmissionId);
    }
    if (!activeSubmissionId) return toast.error("Upload the quote screenshot first to create the observation draft.");
    if (!file) return toast.error(`Select ${requirement.label.toLowerCase()} first.`);
    if (file.size > 52_428_800) return toast.error("Evidence files must be 50 MB or smaller.");
    if (!accepts[requirement.code].split(",").includes(file.type)) return toast.error("The selected file type is not allowed.");
    setUploading(requirement.code);
    const path = `${assignment.study_id}/${assignment.id}/${ownSlot.userId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const supabase = createClient();
    try {
      const digest = await sha256(file);
      const { error } = await supabase.storage.from("paired-testing-evidence").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      const result = await registerEvidenceAction({ submissionId: activeSubmissionId, evidenceType: requirement.code, storagePath: path, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, sha256: digest, capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null });
      if (!result.ok) { await supabase.storage.from("paired-testing-evidence").remove([path]); throw new Error(result.message); }
      setUploadedTypes((current) => [...new Set([...current, requirement.code])]);
      if (requirement.code === "screenshot" && result.evidenceId) {
        setValidation(null);
        setOcrEvidenceId(result.evidenceId);
        setOcrStatus("queued");
        setOcrError("");
        toast.success("Screenshot uploaded. OCR has been queued.");
      } else toast.success(result.message);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Evidence upload failed."); }
    finally { setUploading(null); }
  }

  function submit() {
    if (!submissionId || !observationSaved || !requiredComplete || validation?.serviceValidation !== "matched") return;
    startSubmission(async () => { const result = await submitObservationAction(assignment.id); if (!result.ok) toast.error(result.message); else { toast.success(result.message); router.refresh(); } });
  }

  const activeSubmissionId = submissionId ?? draftId;
  return <section className="space-y-4 border-t border-border pt-5">
    {validation && screenshotUrl ? <ScreenshotCandidateModal key={validation.validationId} open={reviewOpen} onOpenChange={setReviewOpen} imageUrl={screenshotUrl} validation={validation} expectedService={ownSlot.serviceName ?? "Assigned service"} onConfirmed={(confirmed) => { setValidation(confirmed); onOCRResult?.(confirmed); toast.success(confirmed.serviceValidation === "matched" ? "Screenshot confirmed and ride tier verified." : "Selected ride tier does not match."); }} /> : null}
    <div><p className="text-[10px] uppercase text-muted-foreground">Step 1 of 5 · Upload evidence</p><h2 className="mt-1.5 text-base font-semibold">Upload your screenshot and screen recording</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Upload the full-screen quote screenshot first. The selection review opens automatically after processing. Then upload the screen recording saved during the test.</p></div>
    <ScreenshotCaptureGuide platformName={ownSlot.platformName} serviceName={ownSlot.serviceName} />
    {ocrStatus === "queued" || ocrStatus === "processing" ? <div className="rounded-md border border-amber-400/40 bg-amber-400/[0.06] p-3 text-xs"><p className="flex items-center gap-2 font-medium"><LoaderCircle className="size-4 animate-spin" />{ocrStatus === "queued" ? "Screenshot uploaded — waiting for OCR" : "Processing screenshot OCR"}</p><p className="mt-1 text-muted-foreground">You may continue with the screen recording while processing finishes. Queued jobs are retried automatically.</p></div> : null}
    {ocrStatus === "failed" ? <div className="rounded-md border border-red-400/40 bg-red-400/[0.06] p-3 text-xs"><p className="font-medium">Screenshot OCR could not be completed after three attempts</p><p className="mt-1 text-muted-foreground">{ocrError || "Replace the screenshot to create a new OCR job."}</p></div> : null}
    {validation ? <div className={`rounded-md border p-3 text-xs ${validation.selectionStatus === "pending" ? "border-amber-400/40 bg-amber-400/[0.06]" : validation.serviceValidation === "matched" ? "border-primary/35 bg-primary/[0.05]" : "border-red-400/40 bg-red-400/[0.06]"}`}><p className="font-medium">{validation.selectionStatus === "pending" ? "Screenshot details need confirmation" : validation.serviceValidation === "matched" ? "Required service verified" : "Selected service mismatch"}</p><p className="mt-1 text-muted-foreground">Required: {ownSlot.serviceName ?? "Assigned service"} · Detected: {validation.selectionStatus === "pending" ? "Awaiting box selections" : validation.selectedRideLabel ?? "Unreadable"}</p>{validation.selectionStatus === "pending" && screenshotUrl ? <Button size="sm" variant="outline" className="mt-2" onClick={() => setReviewOpen(true)}>Review detected boxes</Button> : null}</div> : null}
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {requirements.map((requirement) => { const Icon = icons[requirement.code]; const uploaded = uploadedTypes.includes(requirement.code); const storedFile = initialEvidence.filter((item) => item.evidence_type === requirement.code).at(-1); return <div key={requirement.code} className="grid gap-3 p-4 sm:grid-cols-[1fr_minmax(220px,1fr)_auto] sm:items-center"><div className="flex items-center gap-3"><Icon className="size-4 text-primary" /><div><p className="text-sm font-medium">{requirement.label}</p><div className="mt-1 flex gap-1.5"><Badge variant={requirement.required ? "outline" : "secondary"}>{requirement.required ? "Required" : "Configured"}</Badge>{uploaded ? <Badge variant="secondary">Uploaded</Badge> : null}</div></div></div><div className="space-y-1.5">{storedFile && !files[requirement.code] ? <p className="truncate text-xs text-muted-foreground">Stored file: <span className="text-foreground">{storedFile.original_filename}</span></p> : null}<Input type="file" accept={accepts[requirement.code]} disabled={(requirement.code !== "screenshot" && !activeSubmissionId) || uploading !== null} onChange={(event) => chooseFile(requirement.code, event.target.files?.[0])} /></div><Button size="sm" variant={uploaded ? "outline" : "default"} disabled={!files[requirement.code] || uploading !== null || (requirement.code !== "screenshot" && !activeSubmissionId)} onClick={() => void upload(requirement)}>{uploading === requirement.code ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploading === requirement.code ? "Uploading..." : uploaded ? "Replace" : "Upload"}</Button></div>; })}
      <div className="grid gap-3 bg-card/20 p-4 sm:grid-cols-[1fr_minmax(220px,1fr)_auto] sm:items-center"><div className="flex items-center gap-3"><FileJson className="size-4 text-primary" /><div><p className="text-sm font-medium">System-generated metadata</p><Badge variant="outline" className="mt-1">Required</Badge></div></div><p className="text-xs text-muted-foreground">Hash, timestamps, OCR candidates, selected boxes, uploader, and storage linkage are recorded.</p><p className={`text-xs font-medium ${requiredComplete ? "text-primary" : "text-muted-foreground"}`}>{requiredComplete ? "Complete" : "Awaiting confirmation"}</p></div>
    </div>
    {showFinalSubmission ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div><p className="text-xs font-medium">Final submission</p><p className="mt-1 text-xs text-muted-foreground">{validation?.selectionStatus === "pending" ? "Confirm all detected screenshot boxes first." : validation?.serviceValidation === "mismatched" ? "A replacement screenshot is required." : !observationSaved ? "Save the latest observation changes first." : !requiredComplete ? "Upload all required evidence to continue." : "Observation and required evidence are complete."}</p></div><Button onClick={submit} disabled={!submissionId || !observationSaved || !requiredComplete || uploading !== null || submitting || validation?.serviceValidation !== "matched"}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{submitting ? "Submitting..." : "Submit observation"}</Button></div> : null}
  </section>;
}
