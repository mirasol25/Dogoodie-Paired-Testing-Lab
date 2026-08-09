"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, FileImage, FileJson, Film, LoaderCircle, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { ensureScreenshotDraftAction, processScreenshotEvidenceAction, registerEvidenceAction, submitObservationAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { ScreenshotCandidateModal } from "@/components/paired-testing/assignments/screenshot-candidate-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return <aside className="rounded-md border border-primary/25 bg-primary/[0.035] p-3"><div className="flex gap-3">
    {guide ? <a href={guide.image} target="_blank" rel="noreferrer" className="relative hidden h-40 w-20 shrink-0 overflow-hidden rounded border border-border bg-background sm:block" aria-label={`Open full ${guide.title.toLowerCase()}`}><Image src={guide.image} alt="" fill sizes="80px" className="object-cover object-bottom" /></a> : null}
    <div className="min-w-0"><div className="flex items-center gap-2"><CircleAlert className="size-4 text-primary" /><p className="text-xs font-semibold">{guide?.title ?? "Quote screenshot checklist"}</p></div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Capture the whole phone screen—do not crop, blur, or cover the status bar. Expected service: <span className="font-medium text-foreground">{serviceName ?? "assigned ride"}</span>.</p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground"><li>- Make the selected ride card and fare visible.</li><li>- Keep status-bar time and battery visible.</li><li>- After upload, select the correct OCR boxes; values cannot be typed.</li></ul>
      {guide ? <a href={guide.image} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline">Open full example</a> : null}
    </div>
  </div></aside>;
}

async function sha256(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function safeFilename(name: string) { return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-160) || "evidence-file"; }

export function EvidenceUploader({ assignment, ownSlot, submissionId, observationSaved, initialEvidence, onOCRResult, onEvidenceStateChange, showFinalSubmission = true }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; submissionId: string | null; observationSaved: boolean; initialEvidence: EvidenceRow[]; onOCRResult?: (result: ScreenshotValidationResult) => void; onEvidenceStateChange?: (state: { requiredComplete: boolean; mismatched: boolean }) => void; showFinalSubmission?: boolean }) {
  const router = useRouter();
  const [submitting, startSubmission] = useTransition();
  const requirements = configuredRequirements(assignment);
  const [uploadedTypes, setUploadedTypes] = useState(() => initialEvidence.map((item) => item.evidence_type));
  const [files, setFiles] = useState<Partial<Record<UploadType, File>>>({});
  const [uploading, setUploading] = useState<UploadType | null>(null);
  const [draftId, setDraftId] = useState<string | null>(submissionId);
  const [validation, setValidation] = useState<ScreenshotValidationResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const screenshotUrlRef = useRef("");
  useEffect(() => () => { if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current); }, []);
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
        const ocr = await processScreenshotEvidenceAction(result.evidenceId);
        if (!ocr.ok || !ocr.validation) toast.error(ocr.message);
        else { setValidation(ocr.validation); setReviewOpen(true); toast.success("OCR candidates are ready. Select the correct boxes."); }
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
    <div><p className="text-[10px] uppercase text-muted-foreground">1. Quote screenshot</p><h2 className="mt-1.5 text-base font-semibold">Upload and validate the selected service</h2><p className="mt-1 text-xs text-muted-foreground">Upload the screenshot, then select the correct detected boxes.</p></div>
    <ScreenshotCaptureGuide platformName={ownSlot.platformName} serviceName={ownSlot.serviceName} />
    {validation ? <div className={`rounded-md border p-3 text-xs ${validation.selectionStatus === "pending" ? "border-amber-400/40 bg-amber-400/[0.06]" : validation.serviceValidation === "matched" ? "border-primary/35 bg-primary/[0.05]" : "border-red-400/40 bg-red-400/[0.06]"}`}><p className="font-medium">{validation.selectionStatus === "pending" ? "Screenshot details need confirmation" : validation.serviceValidation === "matched" ? "Required service verified" : "Selected service mismatch"}</p><p className="mt-1 text-muted-foreground">Required: {ownSlot.serviceName ?? "Assigned service"} · Detected: {validation.selectionStatus === "pending" ? "Awaiting box selections" : validation.selectedRideLabel ?? "Unreadable"}</p>{validation.selectionStatus === "pending" && screenshotUrl ? <Button size="sm" variant="outline" className="mt-2" onClick={() => setReviewOpen(true)}>Review detected boxes</Button> : null}</div> : null}
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {requirements.map((requirement) => { const Icon = icons[requirement.code]; const uploaded = requirement.code !== "screenshot" && uploadedTypes.includes(requirement.code); return <div key={requirement.code} className="grid gap-3 p-4 sm:grid-cols-[1fr_minmax(220px,1fr)_auto] sm:items-center"><div className="flex items-center gap-3"><Icon className="size-4 text-primary" /><div><p className="text-sm font-medium">{requirement.label}</p><Badge variant={requirement.required ? "outline" : "secondary"} className="mt-1">{requirement.required ? "Required" : "Configured"}</Badge></div></div>{uploaded ? <p className="text-xs font-medium text-primary">Uploaded</p> : <Input type="file" accept={accepts[requirement.code]} disabled={(requirement.code !== "screenshot" && !activeSubmissionId) || uploading !== null} onChange={(event) => chooseFile(requirement.code, event.target.files?.[0])} />}<Button size="sm" variant={uploaded ? "outline" : "default"} disabled={uploaded || !files[requirement.code] || uploading !== null || (requirement.code !== "screenshot" && !activeSubmissionId)} onClick={() => void upload(requirement)}>{uploading === requirement.code ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploaded ? "Complete" : uploading === requirement.code ? "Uploading..." : requirement.code === "screenshot" && uploadedTypes.includes("screenshot") ? "Replace" : "Upload"}</Button></div>; })}
      <div className="grid gap-3 bg-card/20 p-4 sm:grid-cols-[1fr_minmax(220px,1fr)_auto] sm:items-center"><div className="flex items-center gap-3"><FileJson className="size-4 text-primary" /><div><p className="text-sm font-medium">System-generated metadata</p><Badge variant="outline" className="mt-1">Required</Badge></div></div><p className="text-xs text-muted-foreground">Hash, timestamps, OCR candidates, selected boxes, uploader, and storage linkage are recorded.</p><p className={`text-xs font-medium ${requiredComplete ? "text-primary" : "text-muted-foreground"}`}>{requiredComplete ? "Complete" : "Awaiting confirmation"}</p></div>
    </div>
    {showFinalSubmission ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div><p className="text-xs font-medium">Final submission</p><p className="mt-1 text-xs text-muted-foreground">{validation?.selectionStatus === "pending" ? "Confirm all detected screenshot boxes first." : validation?.serviceValidation === "mismatched" ? "A replacement screenshot is required." : !observationSaved ? "Save the latest observation changes first." : !requiredComplete ? "Upload all required evidence to continue." : "Observation and required evidence are complete."}</p></div><Button onClick={submit} disabled={!submissionId || !observationSaved || !requiredComplete || uploading !== null || submitting || validation?.serviceValidation !== "matched"}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{submitting ? "Submitting..." : "Submit observation"}</Button></div> : null}
  </section>;
}
