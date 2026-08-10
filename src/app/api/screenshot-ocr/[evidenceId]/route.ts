import { NextResponse } from "next/server";
import { claimScreenshotOCRJob, finishScreenshotOCRJob, getScreenshotOCRJob, getScreenshotValidationByEvidence, processScreenshotEvidence } from "@/lib/data/screenshot-ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  try {
    const { evidenceId } = await params;
    const job = await getScreenshotOCRJob(evidenceId);
    const validation = job?.status === "completed" ? await getScreenshotValidationByEvidence(evidenceId) : null;
    return NextResponse.json({ ...(job ?? { status: "queued", attempt_count: 0, last_error: null }), validation });
  } catch {
    return NextResponse.json({ message: "OCR status is unavailable." }, { status: 403 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await params;
  try {
    const lockToken = crypto.randomUUID();
    const job = await claimScreenshotOCRJob(evidenceId, lockToken);
    if (job.status !== "processing" || job.lock_token !== lockToken) return NextResponse.json(job, { status: 202 });
    try {
      await processScreenshotEvidence(evidenceId);
      await finishScreenshotOCRJob(evidenceId, lockToken);
      return NextResponse.json({ status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Screenshot OCR processing failed.";
      await finishScreenshotOCRJob(evidenceId, lockToken, message);
      return NextResponse.json({ status: "queued", message }, { status: 202 });
    }
  } catch {
    return NextResponse.json({ message: "The OCR job could not be started." }, { status: 403 });
  }
}
