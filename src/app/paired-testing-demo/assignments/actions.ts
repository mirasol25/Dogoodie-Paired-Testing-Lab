"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { AssignmentDataError, createAssignment, createAssignmentBatch } from "@/lib/data/assignments";

export interface AssignmentActionResult {
  ok: boolean;
  message: string;
  assignmentId?: string;
}

export async function createAssignmentAction(input: unknown): Promise<AssignmentActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/assignments");
  try {
    const assignment = await createAssignment(input as never);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath("/paired-testing-demo/audit");
    return { ok: true, message: `${assignment.assignment_code} was created.`, assignmentId: assignment.id };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The assignment could not be created." };
  }
}

export async function createAssignmentBatchAction(input: unknown): Promise<AssignmentActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/assignments");
  try {
    const assignments = await createAssignmentBatch(input as never);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath("/paired-testing-demo/audit");
    return { ok: true, message: `${assignments.length} assignment${assignments.length === 1 ? "" : "s"} created.`, assignmentId: assignments[0]?.id };
  } catch (error) {
    if (error instanceof AssignmentDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The assignment batch could not be created." };
  }
}
