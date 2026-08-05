"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, FileJson, Film, LoaderCircle, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { registerEvidenceAction, submitObservationAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AssignmentSummary, AssignmentTesterSummary, EvidenceRow } from "@/lib/data/assignments";
import { createClient } from "@/lib/supabase/client";

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

async function sha256(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeFilename(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-160) || "evidence-file";
}

export function EvidenceUploader({ assignment, ownSlot, submissionId, observationSaved, initialEvidence }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; submissionId: string | null; observationSaved: boolean; initialEvidence: EvidenceRow[] }) {
  const router = useRouter();
  const [submitting, startSubmission] = useTransition();
  const requirements = configuredRequirements(assignment);
  const [uploadedTypes, setUploadedTypes] = useState(() => initialEvidence.map((item) => item.evidence_type));
  const [files, setFiles] = useState<Partial<Record<UploadType, File>>>({});
  const [uploading, setUploading] = useState<UploadType | null>(null);
  const requiredComplete = requirements.filter((item) => item.required).every((item) => uploadedTypes.includes(item.code));

  async function upload(requirement: Requirement) {
    const file = files[requirement.code];
    if (!submissionId) return toast.error("Save the observation draft before uploading evidence.");
    if (!file) return toast.error(`Select ${requirement.label.toLowerCase()} first.`);
    if (file.size > 52_428_800) return toast.error("Evidence files must be 50 MB or smaller.");
    if (!accepts[requirement.code].split(",").includes(file.type)) return toast.error("The selected file type is not allowed for this evidence.");
    setUploading(requirement.code);
    const path = `${assignment.study_id}/${assignment.id}/${ownSlot.userId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const supabase = createClient();
    try {
      const digest = await sha256(file);
      const { error } = await supabase.storage.from("paired-testing-evidence").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      const result = await registerEvidenceAction({ submissionId, evidenceType: requirement.code, storagePath: path, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, sha256: digest, capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null });
      if (!result.ok) {
        await supabase.storage.from("paired-testing-evidence").remove([path]);
        throw new Error(result.message);
      }
      setUploadedTypes((current) => [...current, requirement.code]);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Evidence upload failed.");
    } finally {
      setUploading(null);
    }
  }

  function submit() {
    if (!submissionId || !observationSaved || !requiredComplete) return;
    startSubmission(async () => {
      const result = await submitObservationAction(assignment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return <section className="space-y-4 border-t border-border pt-5"><div><p className="text-[10px] uppercase text-muted-foreground">Private evidence</p><h2 className="mt-1.5 text-base font-semibold">Upload supporting files</h2><p className="mt-1 text-xs text-muted-foreground">Files are stored privately and linked to this tester submission.</p></div>{!submissionId ? <p className="border-l-2 border-border pl-3 text-xs text-muted-foreground">Save the observation draft to enable evidence uploads.</p> : null}<div className="divide-y divide-border overflow-hidden rounded-md border border-border">{requirements.map((requirement) => {
    const Icon = icons[requirement.code];
    const uploaded = uploadedTypes.includes(requirement.code);
    return <div key={requirement.code} className="grid gap-3 p-4 sm:grid-cols-[1fr_minmax(220px,1fr)_auto] sm:items-center"><div className="flex items-center gap-3"><Icon className="size-4 text-primary" /><div><p className="text-sm font-medium">{requirement.label}</p><Badge variant={requirement.required ? "outline" : "secondary"} className="mt-1">{requirement.required ? "Required" : "Configured"}</Badge></div></div>{uploaded ? <p className="text-xs font-medium text-primary">Uploaded</p> : <Input type="file" accept={accepts[requirement.code]} disabled={!submissionId || uploading !== null} onChange={(event) => setFiles((current) => ({ ...current, [requirement.code]: event.target.files?.[0] }))} />}<Button size="sm" variant={uploaded ? "outline" : "default"} disabled={uploaded || !submissionId || !files[requirement.code] || uploading !== null} onClick={() => void upload(requirement)}>{uploading === requirement.code ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploaded ? "Complete" : uploading === requirement.code ? "Uploading..." : "Upload"}</Button></div>;
  })}<div className="grid gap-3 bg-card/20 p-4 sm:grid-cols-[1fr_minmax(220px,1fr)_auto] sm:items-center"><div className="flex items-center gap-3"><FileJson className="size-4 text-primary" /><div><p className="text-sm font-medium">System-generated metadata</p><Badge variant="outline" className="mt-1">Required</Badge></div></div><p className="text-xs text-muted-foreground">Filename, type, size, hash, timestamps, uploader, and storage linkage are captured automatically.</p><p className={`text-xs font-medium ${requiredComplete ? "text-primary" : "text-muted-foreground"}`}>{requiredComplete ? "Complete" : "Generated with uploads"}</p></div></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div><p className="text-xs font-medium">Final submission</p><p className="mt-1 text-xs text-muted-foreground">{!observationSaved ? "Save the latest observation changes first." : !requiredComplete ? "Upload all required evidence to continue." : "Observation and required evidence are complete."}</p></div><Button onClick={submit} disabled={!submissionId || !observationSaved || !requiredComplete || uploading !== null || submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{submitting ? "Submitting..." : "Submit observation"}</Button></div></section>;
}
