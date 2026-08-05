import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type EvidenceRow = Database["public"]["Tables"]["evidence_files"]["Row"];

export interface EvidenceRecord extends EvidenceRow {
  assignmentCode: string;
  submissionCode: string;
  pairId: string | null;
  pairCode: string | null;
  testerName: string;
}

export class EvidenceDataError extends Error {
  constructor(message: string) { super(message); this.name = "EvidenceDataError"; }
}

export async function listStudyEvidence(studyId: string): Promise<EvidenceRecord[]> {
  const supabase = await createClient();
  const { data: evidence, error } = await supabase.from("evidence_files").select("*").eq("study_id", studyId).order("uploaded_at", { ascending: false });
  if (error) throw new EvidenceDataError("Evidence records could not be loaded.");
  if (!evidence.length) return [];
  const assignmentIds = [...new Set(evidence.map((item) => item.assignment_id))];
  const submissionIds = [...new Set(evidence.map((item) => item.submission_id))];
  const [assignmentsResult, submissionsResult, pairsResult, rosterResult] = await Promise.all([
    supabase.from("assignments").select("id,assignment_code").in("id", assignmentIds),
    supabase.from("submissions").select("id,submission_code,user_id").in("id", submissionIds),
    supabase.from("matched_pairs").select("id,pair_code,submission_a_id,submission_b_id").eq("study_id", studyId),
    supabase.rpc("list_assignment_pair_roster", { p_study_id: studyId }),
  ]);
  if (assignmentsResult.error || submissionsResult.error || pairsResult.error || rosterResult.error) throw new EvidenceDataError("Evidence relationships could not be loaded.");
  const assignments = new Map(assignmentsResult.data.map((item) => [item.id, item.assignment_code]));
  const submissions = new Map(submissionsResult.data.map((item) => [item.id, item]));
  const roster = new Map(rosterResult.data.map((item) => [`${item.assignment_id}:${item.user_id}`, item.display_name?.trim() || item.email || "Unavailable tester"]));
  return evidence.map((item) => {
    const submission = submissions.get(item.submission_id);
    const pair = pairsResult.data.find((candidate) => candidate.submission_a_id === item.submission_id || candidate.submission_b_id === item.submission_id);
    return { ...item, assignmentCode: assignments.get(item.assignment_id) ?? "Unknown assignment", submissionCode: submission?.submission_code ?? "Unknown submission", pairId: pair?.id ?? null, pairCode: pair?.pair_code ?? null, testerName: submission ? roster.get(`${item.assignment_id}:${submission.user_id}`) ?? "Unavailable tester" : "Unavailable tester" };
  });
}
