"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { addStudyMembers, setStudyMembershipStatus, StudyMemberDataError } from "@/lib/data/study-members";
import { createClient } from "@/lib/supabase/server";

export interface StudyMemberActionResult { ok: boolean; message: string; hasActiveProtocol?: boolean }

export async function addStudyMemberAction(input: unknown): Promise<StudyMemberActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    const count = await addStudyMembers(input as never);
    const studyId = input && typeof input === "object" && "studyId" in input && typeof input.studyId === "string" ? input.studyId : null;
    const supabase = await createClient();
    const activeProtocol = studyId
      ? await supabase.from("protocols").select("id").eq("study_id", studyId).eq("status", "active").maybeSingle()
      : { data: null, error: null };
    revalidatePath("/paired-testing-demo/studies", "layout");
    return {
      ok: true,
      message: `${count} ${count === 1 ? "member" : "members"} added.`,
      // If this check cannot be read, retain the members page rather than redirecting unexpectedly.
      hasActiveProtocol: Boolean(activeProtocol.data) || Boolean(activeProtocol.error),
    };
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
