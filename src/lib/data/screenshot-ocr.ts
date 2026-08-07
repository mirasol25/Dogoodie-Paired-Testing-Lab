/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractSelectedRide } from "@/lib/screenshot-ocr/extract-selected-ride";
import { resolveScreenshotService, validateRequiredService, type OCRService } from "@/lib/screenshot-ocr/service-resolver";
import { resolveQuoteTime } from "@/lib/screenshot-ocr/time-parser";
import type { ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

export class ScreenshotOCRError extends Error {}

export async function ensureScreenshotDraft(assignmentId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
  const { data, error } = await db.rpc("ensure_submission_draft", { p_assignment_id: assignmentId });
  if (error || !data) throw new ScreenshotOCRError(error?.message || "A draft could not be created for the screenshot.");
  return data;
}

export async function processScreenshotEvidence(evidenceFileId: string): Promise<ScreenshotValidationResult> {
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => Promise<any>; storage: any };
  const { data: evidence, error: evidenceError } = await db.from("evidence_files").select("*").eq("id", evidenceFileId).eq("evidence_type", "screenshot").maybeSingle();
  if (evidenceError || !evidence) throw new ScreenshotOCRError("The uploaded quote screenshot could not be loaded.");
  const { data: submission, error: submissionError } = await db.from("submissions").select("assignment_tester_id").eq("id", evidence.submission_id).maybeSingle();
  if (submissionError || !submission) throw new ScreenshotOCRError("The screenshot submission could not be loaded.");
  const { data: slot, error: slotError } = await db.from("assignment_testers").select("platform_service_id").eq("id", submission.assignment_tester_id).maybeSingle();
  if (slotError || !slot?.platform_service_id) throw new ScreenshotOCRError("The assignment service is not configured.");
  const { data: requiredService, error: requiredError } = await db.from("platform_services").select("id,platform_id,name").eq("id", slot.platform_service_id).maybeSingle();
  if (requiredError || !requiredService) throw new ScreenshotOCRError("The required platform service could not be loaded.");
  const [{ data: platform }, { data: services, error: servicesError }, { data: study }] = await Promise.all([
    db.from("platforms").select("slug").eq("id", requiredService.platform_id).maybeSingle(),
    db.from("platform_services").select("id,name,service_code,metadata").eq("platform_id", requiredService.platform_id).eq("is_active", true),
    db.from("studies").select("display_timezone").eq("id", evidence.study_id).maybeSingle(),
  ]);
  if (!platform?.slug || servicesError || !services) throw new ScreenshotOCRError("The expected platform services could not be loaded.");
  const { data: file, error: fileError } = await supabase.storage.from(evidence.storage_bucket).download(evidence.storage_path);
  if (fileError || !file) throw new ScreenshotOCRError("The private screenshot file could not be read for OCR.");
  const extracted = await extractSelectedRide(Buffer.from(await file.arrayBuffer()), platform.slug);
  const resolved = resolveScreenshotService(services as OCRService[], extracted.selectedRideLabel);
  const serviceValidation = validateRequiredService(requiredService.id, resolved.platformServiceId);
  const quoteTime = resolveQuoteTime(extracted.statusBarTimeText, evidence.uploaded_at, study?.display_timezone || "UTC");
  const result: ScreenshotValidationResult = { ...extracted, serviceValidation, expectedPlatformServiceId: requiredService.id, detectedPlatformServiceId: resolved.platformServiceId, quoteTime };
  const admin = createAdminClient() as unknown as { from: (table: string) => any };
  const { error: deactivateError } = await admin.from("screenshot_ocr_validations").update({ is_active: false }).eq("submission_id", evidence.submission_id).eq("is_active", true);
  if (deactivateError) throw new ScreenshotOCRError(deactivateError.message || "The earlier screenshot validation could not be replaced.");
  const { error: recordError } = await admin.from("screenshot_ocr_validations").insert({
    evidence_file_id: evidence.id, assignment_id: evidence.assignment_id, submission_id: evidence.submission_id,
    expected_platform_service_id: requiredService.id, detected_platform_service_id: resolved.platformServiceId, service_validation: serviceValidation,
    raw_ride_label: extracted.selectedRideLabel, detected_fare_min: extracted.fare?.min ?? null, detected_fare_max: extracted.fare?.max ?? null,
    detected_status_bar_time: extracted.statusBarTimeText, resolved_quote_timestamp: quoteTime.resolvedTimestamp,
    quote_time_resolution: quoteTime, detected_battery_percentage: extracted.batteryPercentage,
    raw_ocr_output: extracted.diagnostics, warnings: extracted.warnings,
  });
  if (recordError) throw new ScreenshotOCRError(recordError.message || "The screenshot validation could not be saved.");
  return result;
}

export async function getSubmissionScreenshotValidation(submissionId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => any };
  const { data, error } = await db.from("screenshot_ocr_validations").select("*").eq("submission_id", submissionId).eq("is_active", true).maybeSingle();
  if (error) throw new ScreenshotOCRError("The screenshot validation could not be loaded.");
  return data;
}
