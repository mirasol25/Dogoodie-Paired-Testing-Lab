"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { addStudyMembers, setStudyMembershipStatus, StudyMemberDataError } from "@/lib/data/study-members";

export interface StudyMemberActionResult { ok: boolean; message: string }

export async function addStudyMemberAction(input: unknown): Promise<StudyMemberActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    const count = await addStudyMembers(input as never);
    revalidatePath("/paired-testing-demo/studies", "layout");
    return { ok: true, message: `${count} ${count === 1 ? "member" : "members"} added.` };
  } catch (error) {
    return { ok: false, message: error instanceof StudyMemberDataError ? error.message : "The member could not be added." };
  }
}

export async function setStudyMembershipStatusAction(input: unknown): Promise<StudyMemberActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    await setStudyMembershipStatus(input as never);
    revalidatePath("/paired-testing-demo/studies", "layout");
    return { ok: true, message: "Study membership updated." };
  } catch (error) {
    return { ok: false, message: error instanceof StudyMemberDataError ? error.message : "The membership could not be updated." };
  }
}
