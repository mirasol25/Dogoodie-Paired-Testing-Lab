"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth/server";
import { MatchedPairDataError, saveExpertReview } from "@/lib/data/matched-pairs";

export async function saveExpertReviewAction(pairId: string, status: string, reason: string, note: string, technicalException = false): Promise<{ ok: boolean; message: string }> {
  const identity = await requireActiveUser(`/paired-testing-demo/pairs/${pairId}`);
  if (identity.profile.role !== "expert_reviewer") return { ok: false, message: "Only an assigned expert reviewer may make this decision." };
  if (!(["pending", "accepted", "rejected"] as string[]).includes(status)) return { ok: false, message: "Select a valid review decision." };
  if (status !== "pending" && !reason.trim()) return { ok: false, message: "Select a decision reason." };
  if (status === "rejected" && note.trim().length < 10) return { ok: false, message: "Rejected decisions require a note of at least 10 characters." };
  if (technicalException && status !== "accepted") return { ok: false, message: "A technical exception can only be recorded for an accepted pair." };
  if (technicalException && note.trim().length < 20) return { ok: false, message: "Accepting with a technical exception requires a detailed note of at least 20 characters." };
  try {
    await saveExpertReview(pairId, status as "pending" | "accepted" | "rejected", reason.trim(), note.trim(), technicalException);
    revalidatePath("/paired-testing-demo/pairs");
    revalidatePath(`/paired-testing-demo/pairs/${pairId}`);
    revalidatePath("/paired-testing-demo/assignments");
    revalidatePath("/paired-testing-demo/dashboard");
    revalidatePath("/paired-testing-demo/audit");
    return { ok: true, message: status === "pending" ? "Review decision cleared." : technicalException ? "Pair accepted with a technical exception." : `Pair ${status}.` };
  } catch (error) {
    return { ok: false, message: error instanceof MatchedPairDataError ? error.message : "The review decision could not be saved." };
  }
}
