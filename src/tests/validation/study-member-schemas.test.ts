import { describe, expect, it } from "vitest";
import { addStudyMemberSchema, addStudyMembersSchema, setStudyMembershipStatusSchema } from "@/lib/validation/study-member-schemas";

const identifiers = {
  studyId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
};

describe("study membership validation", () => {
  it("accepts valid member identifiers", () => {
    expect(addStudyMemberSchema.safeParse(identifiers).success).toBe(true);
  });

  it("accepts one or more accounts for a batch addition", () => {
    expect(addStudyMembersSchema.safeParse({ studyId: identifiers.studyId, userIds: [identifiers.userId] }).success).toBe(true);
    expect(addStudyMembersSchema.safeParse({ studyId: identifiers.studyId, userIds: [] }).success).toBe(false);
  });

  it("supports only active and removed status transitions", () => {
    expect(setStudyMembershipStatusSchema.safeParse({ ...identifiers, status: "active" }).success).toBe(true);
    expect(setStudyMembershipStatusSchema.safeParse({ ...identifiers, status: "removed" }).success).toBe(true);
    expect(setStudyMembershipStatusSchema.safeParse({ ...identifiers, status: "invited" }).success).toBe(false);
  });

  it("rejects malformed identifiers", () => {
    expect(addStudyMemberSchema.safeParse({ studyId: "study", userId: "user" }).success).toBe(false);
  });
});
