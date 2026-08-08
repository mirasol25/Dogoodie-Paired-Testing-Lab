"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth/server";
import { ACTIVE_STUDY_COOKIE } from "@/lib/data/active-study";
import { createStudyWithInitialRoute, deleteStudyBeforeProtocolActivation, extendStudyTestingPeriod, getAccessibleStudyById, StudyDataError, transitionStudyStatus, updateFullDraftStudy, updateStudyBeforeProtocolActivation } from "@/lib/data/studies";

export interface StudyActionResult {
  ok: boolean;
  message: string;
  studyId?: string;
}

export async function createStudyAction(input: unknown): Promise<StudyActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    const study = await createStudyWithInitialRoute(input as never);
    (await cookies()).set(ACTIVE_STUDY_COOKIE, study.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
    revalidatePath("/paired-testing-demo", "layout");
    return { ok: true, message: `${study.name} was created.`, studyId: study.id };
  } catch (error) {
    if (error instanceof StudyDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The study could not be created." };
  }
}

export async function selectStudyAction(studyId: string): Promise<StudyActionResult> {
  await requireRole(["admin", "test_coordinator", "tester", "expert_reviewer", "law_firm_viewer"], "/paired-testing-demo");
  const study = await getAccessibleStudyById(studyId);
  if (!study) return { ok: false, message: "The selected study is unavailable." };
  (await cookies()).set(ACTIVE_STUDY_COOKIE, study.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  revalidatePath("/paired-testing-demo", "layout");
  return { ok: true, message: `${study.name} is now active.`, studyId: study.id };
}

export async function transitionStudyStatusAction(studyId: string, status: "active" | "paused" | "completed" | "archived"): Promise<StudyActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    const study = await transitionStudyStatus(studyId, status);
    revalidatePath("/paired-testing-demo", "layout");
    return { ok: true, message: `${study.name} is now ${study.status}.`, studyId: study.id };
  } catch (error) {
    if (error instanceof StudyDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The study status could not be changed." };
  }
}

export async function extendStudyTestingPeriodAction(studyId: string, testingEndsAt: string): Promise<StudyActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    const study = await extendStudyTestingPeriod(studyId, testingEndsAt);
    revalidatePath("/paired-testing-demo", "layout");
    return { ok: true, message: `Testing collection is extended until ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.display_timezone }).format(new Date(study.testing_ends_at!))}.`, studyId: study.id };
  } catch (error) {
    if (error instanceof StudyDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The testing period could not be extended." };
  }
}

export async function updateDraftStudyAction(studyId: string, input: {
  name: string;
  studyQuestion: string;
  isolatedVariable: string;
  targetPairCount: number;
  testingStartsAt: string;
  testingEndsAt: string;
}): Promise<StudyActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    const study = await updateStudyBeforeProtocolActivation(studyId, input);
    revalidatePath("/paired-testing-demo", "layout");
    return { ok: true, message: `${study.name} was updated.`, studyId };
  } catch (error) {
    if (error instanceof StudyDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The study could not be updated." };
  }
}

export async function deleteDraftStudyAction(studyId: string): Promise<StudyActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    await deleteStudyBeforeProtocolActivation(studyId);
    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_STUDY_COOKIE)?.value === studyId) cookieStore.delete(ACTIVE_STUDY_COOKIE);
    revalidatePath("/paired-testing-demo", "layout");
    return { ok: true, message: "The draft study was deleted." };
  } catch (error) {
    if (error instanceof StudyDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The study could not be deleted." };
  }
}

export async function updateFullDraftStudyAction(studyId: string, input: unknown): Promise<StudyActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  try {
    const study = await updateFullDraftStudy(studyId, input as never);
    revalidatePath("/paired-testing-demo", "layout");
    return { ok: true, message: `${study.name} was updated.`, studyId };
  } catch (error) {
    if (error instanceof StudyDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The study could not be updated." };
  }
}
