/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractSelectedRide } from "@/lib/screenshot-ocr/extract-selected-ride";
import { resolveScreenshotService, validateRequiredService, type OCRService } from "@/lib/screenshot-ocr/service-resolver";
import { resolveQuoteTime } from "@/lib/screenshot-ocr/time-parser";
import { parseStatusBarTime } from "@/lib/screenshot-ocr/time-parser";
import { recognizeWithGoogleVision } from "@/lib/screenshot-ocr/google-vision";
import sharp from "sharp";
import type { NormalizedBounds, ScreenshotCandidate, ScreenshotCandidateSelections, ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

export class ScreenshotOCRError extends Error {}

export type ScreenshotOCRJobStatus = "queued" | "processing" | "completed" | "failed";

export async function claimScreenshotOCRJob(evidenceFileId: string, lockToken: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc("claim_screenshot_ocr_job", { p_evidence_file_id: evidenceFileId, p_lock_token: lockToken });
  if (error || !data) throw new ScreenshotOCRError(error?.message || "The screenshot OCR job could not be claimed.");
  return data as { id: string; status: ScreenshotOCRJobStatus; attempt_count: number; last_error: string | null; lock_token: string | null };
}

export async function getScreenshotOCRJob(evidenceFileId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).from("screenshot_ocr_jobs").select("status,attempt_count,last_error").eq("evidence_file_id", evidenceFileId).maybeSingle();
  if (error) throw new ScreenshotOCRError("The screenshot OCR status could not be loaded.");
  return data as { status: ScreenshotOCRJobStatus; attempt_count: number; last_error: string | null } | null;
}

export async function getScreenshotValidationByEvidence(evidenceFileId: string): Promise<ScreenshotValidationResult | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).from("screenshot_ocr_validations").select("*").eq("evidence_file_id", evidenceFileId).eq("is_active", true).maybeSingle();
  if (error) throw new ScreenshotOCRError("The screenshot validation could not be loaded.");
  return data ? restoreScreenshotValidation(data) : null;
}

export async function finishScreenshotOCRJob(evidenceFileId: string, lockToken: string, errorMessage?: string) {
  const admin = createAdminClient() as any;
  const failed = Boolean(errorMessage);
  const { data: job } = await admin.from("screenshot_ocr_jobs").select("attempt_count").eq("evidence_file_id", evidenceFileId).maybeSingle();
  const terminal = failed && (job?.attempt_count ?? 3) >= 3;
  await admin.from("screenshot_ocr_jobs").update(failed ? {
    status: terminal ? "failed" : "queued",
    next_attempt_at: new Date(Date.now() + Math.min(30_000, 2 ** (job?.attempt_count ?? 1) * 2_000)).toISOString(),
    locked_at: null, lock_token: null, last_error: errorMessage, updated_at: new Date().toISOString(),
  } : {
    status: "completed", locked_at: null, lock_token: null, last_error: null,
    completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("evidence_file_id", evidenceFileId).eq("lock_token", lockToken);
}

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
  const { data: slot, error: slotError } = await db.from("assignment_testers").select("platform_service_id,account_configuration").eq("id", submission.assignment_tester_id).maybeSingle();
  if (slotError || !slot?.platform_service_id) throw new ScreenshotOCRError("The assignment service is not configured.");
  const { data: requiredService, error: requiredError } = await db.from("platform_services").select("id,platform_id,name").eq("id", slot.platform_service_id).maybeSingle();
  if (requiredError || !requiredService) throw new ScreenshotOCRError("The required platform service could not be loaded.");
  const [{ data: platform }, { data: services, error: servicesError }, { data: study }, { data: assignment }] = await Promise.all([
    db.from("platforms").select("slug").eq("id", requiredService.platform_id).maybeSingle(),
    db.from("platform_services").select("id,name,service_code,metadata").eq("platform_id", requiredService.platform_id).eq("is_active", true),
    db.from("studies").select("display_timezone").eq("id", evidence.study_id).maybeSingle(),
    db.from("assignments").select("scheduled_start").eq("id", evidence.assignment_id).maybeSingle(),
  ]);
  if (!platform?.slug || servicesError || !services) throw new ScreenshotOCRError("The expected platform services could not be loaded.");
  const { data: file, error: fileError } = await supabase.storage.from(evidence.storage_bucket).download(evidence.storage_path);
  if (fileError || !file) throw new ScreenshotOCRError("The private screenshot file could not be read for OCR.");
  const extracted = await extractSelectedRide(Buffer.from(await file.arrayBuffer()), platform.slug);
  const timezone = study?.display_timezone || "UTC";
  const slotConfiguration = slot.account_configuration && typeof slot.account_configuration === "object" && !Array.isArray(slot.account_configuration) ? slot.account_configuration : {};
  const testStartsAt = typeof slotConfiguration.scheduled_start === "string" ? slotConfiguration.scheduled_start : assignment?.scheduled_start;
  const candidates = extracted.candidates.flatMap((candidate): ScreenshotCandidate[] => {
    if (candidate.type === "time") {
      const resolution = resolveQuoteTime(String(candidate.parsedValue), evidence.uploaded_at, timezone);
      const resolvedTime = resolution.resolvedTimestamp ? new Date(resolution.resolvedTimestamp).getTime() : Number.NaN;
      const startsAt = testStartsAt ? new Date(testStartsAt).getTime() : Number.NaN;
      const uploadedAt = new Date(evidence.uploaded_at).getTime();
      const beforeTest = Number.isFinite(resolvedTime) && Number.isFinite(startsAt) && resolvedTime < startsAt;
      const afterUpload = Number.isFinite(resolvedTime) && Number.isFinite(uploadedAt) && resolvedTime > uploadedAt + 120_000;
      const invalid = !resolution.resolvedTimestamp || beforeTest || afterUpload;
      return [{ ...candidate, validationStatus: invalid ? "invalid" : "valid", validationMessage: beforeTest ? "This time is before the assigned test window." : afterUpload ? "This time is later than the screenshot upload." : !resolution.resolvedTimestamp ? "This time is too far from the current test upload." : null }];
    }
    if (candidate.type !== "ride_card") return [candidate];
    const candidateService = resolveScreenshotService(services as OCRService[], candidate.text);
    return candidateService.platformServiceId ? [{ ...candidate, displayValue: candidateService.platformServiceName ?? candidate.text, platformServiceId: candidateService.platformServiceId }] : [];
  });
  const serviceValidation = "unverified" as const;
  const quoteTime = resolveQuoteTime(extracted.statusBarTimeText, evidence.uploaded_at, timezone);
  const admin = createAdminClient() as unknown as { from: (table: string) => any };
  const { error: deactivateError } = await admin.from("screenshot_ocr_validations").update({ is_active: false }).eq("submission_id", evidence.submission_id).eq("is_active", true);
  if (deactivateError) throw new ScreenshotOCRError(deactivateError.message || "The earlier screenshot validation could not be replaced.");
  const { data: savedValidation, error: recordError } = await admin.from("screenshot_ocr_validations").insert({
    evidence_file_id: evidence.id, assignment_id: evidence.assignment_id, submission_id: evidence.submission_id,
    expected_platform_service_id: requiredService.id, detected_platform_service_id: null, service_validation: serviceValidation,
    raw_ride_label: extracted.selectedRideLabel, detected_fare_min: extracted.fare?.min ?? null, detected_fare_max: extracted.fare?.max ?? null,
    detected_status_bar_time: extracted.statusBarTimeText, resolved_quote_timestamp: quoteTime.resolvedTimestamp,
    quote_time_resolution: quoteTime, detected_battery_percentage: extracted.batteryPercentage,
    raw_ocr_output: extracted.diagnostics, warnings: extracted.warnings, candidates, selection_status: "pending",
  }).select("id").single();
  if (recordError || !savedValidation) throw new ScreenshotOCRError(recordError?.message || "The screenshot validation could not be saved.");
  return { ...extracted, candidates, serviceValidation, expectedPlatformServiceId: requiredService.id, detectedPlatformServiceId: null, quoteTime, validationId: savedValidation.id, selectionStatus: "pending" };
}

function selectedCandidate(candidates: ScreenshotCandidate[], id: string, type: ScreenshotCandidate["type"]) {
  return candidates.find((candidate) => candidate.id === id && candidate.type === type);
}

export async function detectTimeCandidateFromRegion(validationId: string, bounds: NormalizedBounds, userId: string): Promise<ScreenshotCandidate> {
  const values = [bounds.x, bounds.y, bounds.width, bounds.height];
  if (values.some((value) => !Number.isFinite(value)) || bounds.x < 0 || bounds.y < 0 || bounds.width < 0.02 || bounds.height < 0.01 || bounds.x + bounds.width > 1 || bounds.y + bounds.height > 1) {
    throw new ScreenshotOCRError("Draw a box closely around the complete status-bar time.");
  }
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => any; storage: any };
  const { data: validation } = await db.from("screenshot_ocr_validations").select("*").eq("id", validationId).eq("is_active", true).maybeSingle();
  if (!validation) throw new ScreenshotOCRError("The screenshot candidates are no longer available.");
  const { data: evidence } = await db.from("evidence_files").select("uploaded_at,uploaded_by,study_id,assignment_id,storage_bucket,storage_path").eq("id", validation.evidence_file_id).eq("uploaded_by", userId).maybeSingle();
  if (!evidence) throw new ScreenshotOCRError("The screenshot evidence is unavailable.");
  const { data: file, error: fileError } = await supabase.storage.from(evidence.storage_bucket).download(evidence.storage_path);
  if (fileError || !file) throw new ScreenshotOCRError("The screenshot could not be read.");
  const image = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(image).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw new ScreenshotOCRError("The screenshot dimensions could not be read.");
  const left = Math.max(0, Math.floor(bounds.x * width));
  const top = Math.max(0, Math.floor(bounds.y * height));
  const cropWidth = Math.min(width - left, Math.max(1, Math.ceil(bounds.width * width)));
  const cropHeight = Math.min(height - top, Math.max(1, Math.ceil(bounds.height * height)));
  const cropped = await sharp(image).extract({ left, top, width: cropWidth, height: cropHeight }).png().toBuffer();
  const recognized = await recognizeWithGoogleVision(cropped);
  const parsedTime = parseStatusBarTime(recognized.text);
  if (!parsedTime) throw new ScreenshotOCRError("No time was readable inside that box. Draw a tighter box around the complete time.");
  const { data: study } = await db.from("studies").select("display_timezone").eq("id", evidence.study_id).maybeSingle();
  const { data: assignment } = await db.from("assignments").select("scheduled_start").eq("id", evidence.assignment_id).maybeSingle();
  const resolution = resolveQuoteTime(parsedTime, evidence.uploaded_at, study?.display_timezone || "UTC");
  const resolvedTime = resolution.resolvedTimestamp ? new Date(resolution.resolvedTimestamp).getTime() : Number.NaN;
  const startsAt = assignment?.scheduled_start ? new Date(assignment.scheduled_start).getTime() : Number.NaN;
  const uploadedAt = new Date(evidence.uploaded_at).getTime();
  const beforeTest = Number.isFinite(resolvedTime) && Number.isFinite(startsAt) && resolvedTime < startsAt;
  const afterUpload = Number.isFinite(resolvedTime) && resolvedTime > uploadedAt + 120_000;
  const invalid = !resolution.resolvedTimestamp || beforeTest || afterUpload;
  const candidate: ScreenshotCandidate = {
    id: `time-region-${crypto.randomUUID()}`,
    type: "time",
    text: recognized.text.trim(),
    displayValue: parsedTime,
    parsedValue: parsedTime,
    bounds,
    validationStatus: invalid ? "invalid" : "valid",
    validationMessage: beforeTest ? "This time is before the assigned test window." : afterUpload ? "This time is later than the screenshot upload." : !resolution.resolvedTimestamp ? "This time is too far from the current test upload." : null,
  };
  const candidates = [...(validation.candidates as ScreenshotCandidate[]).filter((item) => item.id !== candidate.id), candidate];
  const admin = createAdminClient() as unknown as { from: (table: string) => any };
  const { error: updateError } = await admin.from("screenshot_ocr_validations").update({ candidates }).eq("id", validationId).eq("is_active", true);
  if (updateError) throw new ScreenshotOCRError("The highlighted time could not be saved.");
  return candidate;
}

export async function confirmScreenshotCandidateSelection(validationId: string, selections: ScreenshotCandidateSelections, userId: string): Promise<ScreenshotValidationResult> {
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => any };
  const { data: validation, error } = await db.from("screenshot_ocr_validations").select("*").eq("id", validationId).eq("is_active", true).maybeSingle();
  if (error || !validation) throw new ScreenshotOCRError("The screenshot candidates are no longer available.");
  const { data: evidence } = await db.from("evidence_files").select("uploaded_at,uploaded_by,study_id").eq("id", validation.evidence_file_id).eq("uploaded_by", userId).maybeSingle();
  if (!evidence) throw new ScreenshotOCRError("The screenshot evidence is unavailable.");
  const candidates = validation.candidates as ScreenshotCandidate[];
  const ride = selectedCandidate(candidates, selections.rideCardCandidateId, "ride_card");
  const fare = selectedCandidate(candidates, selections.fareCandidateId, "fare");
  const time = selectedCandidate(candidates, selections.timeCandidateId, "time");
  if (!ride?.platformServiceId || !fare || !time) throw new ScreenshotOCRError("A required screenshot detail is missing or unreadable. Repeat the test and replace both the screenshot and screen recording.");
  if (ride.platformServiceId !== validation.expected_platform_service_id) throw new ScreenshotOCRError("The detected ride tier does not match this assignment. Repeat the test and replace both the screenshot and screen recording.");
  const fareCenter = { x: fare.bounds.x + fare.bounds.width / 2, y: fare.bounds.y + fare.bounds.height / 2 };
  const fareBelongsToRide = fareCenter.x >= ride.bounds.x - 0.03 && fareCenter.x <= ride.bounds.x + ride.bounds.width + 0.03
    && fareCenter.y >= ride.bounds.y - 0.03 && fareCenter.y <= ride.bounds.y + ride.bounds.height + 0.03;
  if (!fareBelongsToRide) throw new ScreenshotOCRError("The selected fare does not belong to the selected ride card. Choose the correct fare, or repeat the test and replace both evidence files if it is not available.");
  const fareValue = fare.parsedValue as { min: number; max: number | null };
  if (!Number.isFinite(fareValue.min)) throw new ScreenshotOCRError("One of the selected screenshot candidates is invalid.");
  if (time.validationStatus === "invalid") throw new ScreenshotOCRError(`${time.validationMessage || "The screenshot time is invalid"} Repeat the test and replace both the screenshot and screen recording.`);
  const { data: study } = await db.from("studies").select("display_timezone").eq("id", evidence.study_id).maybeSingle();
  const quoteTime = resolveQuoteTime(String(time.parsedValue), evidence.uploaded_at, study?.display_timezone || "UTC");
  if (!quoteTime.resolvedTimestamp) throw new ScreenshotOCRError("The screenshot time is missing, unreadable, or outside the current test attempt. Repeat the test and replace both the screenshot and screen recording.");
  const serviceValidation = validateRequiredService(validation.expected_platform_service_id, ride.platformServiceId);
  const admin = createAdminClient() as unknown as { from: (table: string) => any };
  const { error: updateError } = await admin.from("screenshot_ocr_validations").update({
    detected_platform_service_id: ride.platformServiceId, service_validation: serviceValidation,
    raw_ride_label: ride.text, detected_fare_min: fareValue.min, detected_fare_max: fareValue.max,
    detected_status_bar_time: String(time.parsedValue), resolved_quote_timestamp: quoteTime.resolvedTimestamp,
    quote_time_resolution: quoteTime,
    selected_candidates: selections, selection_status: "confirmed", confirmed_by: evidence.uploaded_by, confirmed_at: new Date().toISOString(),
  }).eq("id", validationId).eq("is_active", true);
  if (updateError) throw new ScreenshotOCRError(updateError.message || "The screenshot selections could not be confirmed.");
  return {
    selectedRideLabel: ride.text, fare: fareValue, statusBarTimeText: String(time.parsedValue), batteryPercentage: validation.detected_battery_percentage,
    warnings: validation.warnings ?? [], diagnostics: validation.raw_ocr_output ?? { selectedCardRawText: "" }, candidates,
    serviceValidation, expectedPlatformServiceId: validation.expected_platform_service_id, detectedPlatformServiceId: ride.platformServiceId,
    quoteTime, validationId, selectionStatus: "confirmed",
  };
}

export async function getSubmissionScreenshotValidation(submissionId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => any };
  const { data, error } = await db.from("screenshot_ocr_validations").select("*").eq("submission_id", submissionId).eq("is_active", true).maybeSingle();
  if (error) throw new ScreenshotOCRError("The screenshot validation could not be loaded.");
  return data;
}

export async function getRestoredSubmissionScreenshotValidation(submissionId: string): Promise<ScreenshotValidationResult | null> {
  const data = await getSubmissionScreenshotValidation(submissionId);
  if (!data) return null;
  return restoreScreenshotValidation(data);
}

function restoreScreenshotValidation(data: any): ScreenshotValidationResult {
  const fareMin = data.detected_fare_min === null ? null : Number(data.detected_fare_min);
  const fareMax = data.detected_fare_max === null ? null : Number(data.detected_fare_max);
  return {
    selectedRideLabel: data.raw_ride_label,
    fare: fareMin === null || !Number.isFinite(fareMin) ? null : { min: fareMin, max: fareMax !== null && Number.isFinite(fareMax) ? fareMax : null },
    statusBarTimeText: data.detected_status_bar_time,
    batteryPercentage: data.detected_battery_percentage,
    warnings: Array.isArray(data.warnings) ? data.warnings as string[] : [],
    diagnostics: data.raw_ocr_output && typeof data.raw_ocr_output === "object" && !Array.isArray(data.raw_ocr_output) ? data.raw_ocr_output : { selectedCardRawText: "" },
    candidates: Array.isArray(data.candidates) ? data.candidates as ScreenshotCandidate[] : [],
    serviceValidation: data.service_validation,
    expectedPlatformServiceId: data.expected_platform_service_id,
    detectedPlatformServiceId: data.detected_platform_service_id,
    quoteTime: data.quote_time_resolution,
    validationId: data.id,
    selectionStatus: data.selection_status,
    selectedCandidates: data.selected_candidates && typeof data.selected_candidates === "object" && !Array.isArray(data.selected_candidates) ? data.selected_candidates as Partial<ScreenshotCandidateSelections> : {},
  } as ScreenshotValidationResult;
}
