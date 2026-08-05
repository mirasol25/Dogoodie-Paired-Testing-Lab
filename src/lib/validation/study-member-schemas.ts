import { z } from "zod";

export const addStudyMemberSchema = z.object({ studyId: z.string().uuid(), userId: z.string().uuid() });
export const addStudyMembersSchema = z.object({ studyId: z.string().uuid(), userIds: z.array(z.string().uuid()).min(1, "Select at least one account.").max(100) });
export const setStudyMembershipStatusSchema = addStudyMemberSchema.extend({ status: z.enum(["active", "removed"]) });

export type AddStudyMemberInput = z.input<typeof addStudyMemberSchema>;
export type AddStudyMembersInput = z.input<typeof addStudyMembersSchema>;
export type SetStudyMembershipStatusInput = z.input<typeof setStudyMembershipStatusSchema>;
