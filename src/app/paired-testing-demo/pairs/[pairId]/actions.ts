"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth/server";
import { MatchedPairDataError, saveExpertReview } from "@/lib/data/matched-pairs";

export async function saveExpertReviewAction(pairId: string, status: string, reason: string, note: string): Promise<{ ok: boolean; message: string }> {
  const identity = await requireActiveUser(`/paired-testing-demo/pairs/${pairId}`);
  if (identity.profile.role !== "expert_reviewer") return { ok: false, message: "Only an assigned expert reviewer may make this decision." };
  if (!(["pending", "accepted", "flagged", "rejected"] as string[]).includes(status)) return { ok: false, message: "Select a valid review decision." };
  if (status !== "pending" && !reason.trim()) return { ok: false, message: "Select a decision reason." };
  if (["flagged", "rejected"].includes(status) && note.trim().length < 10) return { ok: false, message: "Flagged and rejected decisions require a note of at least 10 characters." };
  try {
    await saveExpertReview(pairId, status as "pending" | "accepted" | "flagged" | "rejected", reason.trim(), note.trim());
    revalidatePath("/paired-testing-demo/pairs");
    revalidatePath(`/paired-testing-demo/pairs/${pairId}`);
    revalidatePath("/paired-testing-demo/audit");
    return { ok: true, message: status === "pending" ? "Review decision cleared." : `Pair ${status}.` };
  } catch (error) {
    return { ok: false, message: error instanceof MatchedPairDataError ? error.message : "The review decision could not be saved." };
  }
}
