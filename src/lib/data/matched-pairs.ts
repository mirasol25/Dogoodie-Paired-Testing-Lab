import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type PairRow = Database["public"]["Tables"]["matched_pairs"]["Row"];
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

export interface MatchedPairSubmission extends SubmissionRow {
  testerName: string;
  slot: Database["public"]["Enums"]["tester_slot"];
}

export interface MatchedPairSummary extends PairRow {
  assignmentCode: string;
  protocolId: string;
  reviewStatus: Database["public"]["Enums"]["review_status"];
  reviewTechnicalException: boolean;
  submissionA: MatchedPairSubmission;
  submissionB: MatchedPairSubmission;
}

export type MatchedPairValidationResult = Database["public"]["Tables"]["validation_results"]["Row"];
export type ExpertReview = Database["public"]["Tables"]["expert_reviews"]["Row"];

export class MatchedPairDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchedPairDataError";
  }
}

export async function listStudyMatchedPairs(studyId: string): Promise<MatchedPairSummary[]> {
  const supabase = await createClient();
  const { data: pairs, error } = await supabase
    .from("matched_pairs")
    .select("*")
    .eq("study_id", studyId)
    .order("paired_at", { ascending: false, nullsFirst: false });
  if (error) throw new MatchedPairDataError("Matched pairs could not be loaded.");
  if (!pairs.length) return [];

  const assignmentIds = pairs.map((pair) => pair.assignment_id);
  const submissionIds = pairs.flatMap((pair) => [pair.submission_a_id, pair.submission_b_id]);
  const [assignmentsResult, submissionsResult, slotsResult, rosterResult, reviewsResult] = await Promise.all([
    supabase.from("assignments").select("id,assignment_code,protocol_id").in("id", assignmentIds),
    supabase.from("submissions").select("*").in("id", submissionIds),
    supabase.from("assignment_testers").select("assignment_id,user_id,slot").in("assignment_id", assignmentIds),
    supabase.rpc("list_assignment_pair_roster", { p_study_id: studyId }),
    supabase.from("expert_reviews").select("matched_pair_id,status,technical_exception,updated_at").in("matched_pair_id", pairs.map((pair) => pair.id)).order("updated_at", { ascending: false }),
  ]);
  if (assignmentsResult.error || submissionsResult.error || slotsResult.error || rosterResult.error || reviewsResult.error) {
    throw new MatchedPairDataError("Matched-pair details could not be loaded.");
  }

  const assignments = new Map(assignmentsResult.data.map((row) => [row.id, {
    assignmentCode: row.assignment_code,
    protocolId: row.protocol_id,
  }]));
  const submissions = new Map(submissionsResult.data.map((row) => [row.id, row]));
  const roster = new Map(rosterResult.data.map((row) => [
    `${row.assignment_id}:${row.user_id}`,
    row.display_name?.trim() || row.email || "Unavailable tester",
  ]));
  const reviews = new Map<string, { status: Database["public"]["Enums"]["review_status"]; technicalException: boolean }>();
  for (const review of reviewsResult.data) {
    if (!reviews.has(review.matched_pair_id)) reviews.set(review.matched_pair_id, { status: review.status, technicalException: review.technical_exception });
  }

  return pairs.flatMap((pair) => {
    const a = submissions.get(pair.submission_a_id);
    const b = submissions.get(pair.submission_b_id);
    const slotA = slotsResult.data.find((slot) => slot.assignment_id === pair.assignment_id && slot.slot === "tester_a");
    const slotB = slotsResult.data.find((slot) => slot.assignment_id === pair.assignment_id && slot.slot === "tester_b");
    if (!a || !b || !slotA || !slotB) return [];
    return [{
      ...pair,
      assignmentCode: assignments.get(pair.assignment_id)?.assignmentCode ?? "Unknown assignment",
      protocolId: assignments.get(pair.assignment_id)?.protocolId ?? "",
      reviewStatus: reviews.get(pair.id)?.status ?? "pending",
      reviewTechnicalException: reviews.get(pair.id)?.technicalException ?? false,
      submissionA: { ...a, slot: "tester_a", testerName: roster.get(`${pair.assignment_id}:${slotA.user_id}`) ?? "Tester A" },
      submissionB: { ...b, slot: "tester_b", testerName: roster.get(`${pair.assignment_id}:${slotB.user_id}`) ?? "Tester B" },
    }];
  });
}

export async function getStudyMatchedPair(studyId: string, pairId: string): Promise<MatchedPairSummary | null> {
  const pairs = await listStudyMatchedPairs(studyId);
  return pairs.find((pair) => pair.id === pairId) ?? null;
}

export async function listPairValidationResults(pairId: string): Promise<MatchedPairValidationResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("validation_results")
    .select("*")
    .eq("matched_pair_id", pairId)
    .order("created_at");
  if (error) throw new MatchedPairDataError("Technical validation results could not be loaded.");
  return data;
}

export async function listStudyValidationResults(pairIds: string[]): Promise<MatchedPairValidationResult[]> {
  if (!pairIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("validation_results")
    .select("*")
    .in("matched_pair_id", pairIds)
    .order("matched_pair_id")
    .order("created_at");
  if (error) throw new MatchedPairDataError("Study validation results could not be loaded.");
  return data;
}

export async function listPairReviews(pairId: string): Promise<ExpertReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expert_reviews").select("*").eq("matched_pair_id", pairId).order("updated_at", { ascending: false });
  if (error) throw new MatchedPairDataError("Expert review history could not be loaded.");
  return data;
}

export async function listStudyReviews(pairIds: string[]): Promise<ExpertReview[]> {
  if (!pairIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("expert_reviews").select("*").in("matched_pair_id", pairIds).order("updated_at", { ascending: false });
  if (error) throw new MatchedPairDataError("Study review decisions could not be loaded.");
  return data;
}

export async function saveExpertReview(pairId: string, status: "pending" | "accepted" | "rejected", reason: string, note: string, technicalException = false): Promise<ExpertReview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_expert_review", { p_matched_pair_id: pairId, p_status: status, p_reason: reason, p_note: note, p_technical_exception: technicalException });
  if (error || !data) throw new MatchedPairDataError(error?.message || "The expert review could not be saved.");
  return data;
}
