import { createClient } from "@/lib/supabase/server";
import { addStudyMemberSchema, addStudyMembersSchema, setStudyMembershipStatusSchema, type AddStudyMemberInput, type AddStudyMembersInput, type SetStudyMembershipStatusInput } from "@/lib/validation/study-member-schemas";
import type { Database } from "@/types/database.types";

export type StudyMember = Database["public"]["Functions"]["list_study_members"]["Returns"][number];
export type EligibleStudyAccount = Database["public"]["Functions"]["list_eligible_study_accounts"]["Returns"][number];

export class StudyMemberDataError extends Error {}

export async function listStudyMembers(studyId: string): Promise<StudyMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_study_members", { p_study_id: studyId });
  if (error) throw new StudyMemberDataError(error.message || "Study members could not be loaded.");
  return data;
}

export async function listEligibleStudyAccounts(studyId: string): Promise<EligibleStudyAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_eligible_study_accounts", { p_study_id: studyId });
  if (error) throw new StudyMemberDataError(error.message || "Eligible accounts could not be loaded.");
  return data;
}

export async function addStudyMember(input: AddStudyMemberInput): Promise<void> {
  const parsed = addStudyMemberSchema.safeParse(input);
  if (!parsed.success) throw new StudyMemberDataError("Invalid study member request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_study_member", { p_study_id: parsed.data.studyId, p_user_id: parsed.data.userId });
  if (error) throw new StudyMemberDataError(error.message || "The member could not be added.");
}

export async function addStudyMembers(input: AddStudyMembersInput): Promise<number> {
  const parsed = addStudyMembersSchema.safeParse(input);
  if (!parsed.success) throw new StudyMemberDataError(parsed.error.issues[0]?.message || "Invalid study member request.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_study_members", { p_study_id: parsed.data.studyId, p_user_ids: parsed.data.userIds });
  if (error) throw new StudyMemberDataError(error.message || "The members could not be added.");
  return data;
}

export async function setStudyMembershipStatus(input: SetStudyMembershipStatusInput): Promise<void> {
  const parsed = setStudyMembershipStatusSchema.safeParse(input);
  if (!parsed.success) throw new StudyMemberDataError("Invalid membership update.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_study_membership_status", { p_study_id: parsed.data.studyId, p_user_id: parsed.data.userId, p_membership_status: parsed.data.status });
  if (error) throw new StudyMemberDataError(error.message || "The membership could not be updated.");
}
