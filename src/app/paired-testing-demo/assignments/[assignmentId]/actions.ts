"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth/server";
import { AssignmentDataError, cancelAssignment, confirmAssignmentReady, registerSubmissionEvidence, reopenSubmission, saveSubmissionDraft, startAssignmentTest, submitTesterObservation } from "@/lib/data/assignments";
import { requireRole } from "@/lib/auth/server";

export async function cancelAssignmentAction(assignmentId: string, reason: string): Promise<{ ok: boolean; message: string }> {
  await requireRole(["admin", "test_coordinator"], `/paired-testing-demo/assignments/${assignmentId}`);
  try {
    const assignment = await cancelAssignment(assignmentId, reason);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath(`/paired-testing-demo/assignments/${assignmentId}`);
    revalidatePath("/paired-testing-demo/audit");
    return { ok: true, message: `${assignment.assignment_code} was cancelled.` };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The assignment could not be cancelled." };
  }
}

export async function reopenSubmissionAction(assignmentId: string, submissionId: string, reason: string): Promise<{ ok: boolean; message: string }> {
  await requireRole(["admin"], `/paired-testing-demo/assignments/${assignmentId}`);
  try {
    const submission = await reopenSubmission(submissionId, reason);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath(`/paired-testing-demo/assignments/${assignmentId}`);
    revalidatePath("/paired-testing-demo/pairs");
    revalidatePath("/paired-testing-demo/reports");
    revalidatePath("/paired-testing-demo/audit");
    return { ok: true, message: `${submission.submission_code ?? "Observation"} was reopened for correction.` };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The submission could not be reopened." };
  }
}

export async function confirmReadyAction(assignmentId: string): Promise<{ ok: boolean; message: string }> {
  await requireActiveUser(`/paired-testing-demo/assignments/${assignmentId}`);
  try {
    await confirmAssignmentReady(assignmentId);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath(`/paired-testing-demo/assignments/${assignmentId}`);
    return { ok: true, message: "You are ready for this assignment." };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Readiness could not be confirmed." };
  }
}

export async function submitObservationAction(assignmentId: string): Promise<{ ok: boolean; message: string }> {
  await requireActiveUser(`/paired-testing-demo/assignments/${assignmentId}`);
  try {
    const submission = await submitTesterObservation(assignmentId);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath(`/paired-testing-demo/assignments/${assignmentId}`);
    revalidatePath("/paired-testing-demo/audit");
    return { ok: true, message: `${submission.submission_code ?? "Observation"} submitted.` };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The observation could not be submitted." };
  }
}

export async function saveSubmissionDraftAction(input: unknown): Promise<{ ok: boolean; message: string; submissionId?: string }> {
  await requireActiveUser("/paired-testing-demo/assignments");
  try {
    const submission = await saveSubmissionDraft(input as never);
    revalidatePath("/paired-testing-demo/assignments");
    return { ok: true, message: `${submission.submission_code ?? submission.id} draft saved.`, submissionId: submission.id };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The submission draft could not be saved." };
  }
}

export async function registerEvidenceAction(input: unknown): Promise<{ ok: boolean; message: string; evidenceId?: string }> {
  await requireActiveUser("/paired-testing-demo/assignments");
  try {
    const evidence = await registerSubmissionEvidence(input as never);
    revalidatePath("/paired-testing-demo/assignments");
    return { ok: true, message: `${evidence.evidence_code ?? "Evidence"} uploaded.`, evidenceId: evidence.id };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Evidence could not be registered." };
  }
}

export async function startTestAction(assignmentId: string): Promise<{ ok: boolean; message: string }> {
  await requireActiveUser(`/paired-testing-demo/assignments/${assignmentId}`);
  try {
    await startAssignmentTest(assignmentId);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath(`/paired-testing-demo/assignments/${assignmentId}`);
    return { ok: true, message: "Testing session started." };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The test could not be started." };
  }
}
