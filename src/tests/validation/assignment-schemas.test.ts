import { describe, expect, it } from "vitest";
import { assignmentSetupSchema, assignmentTesterPairSchema, createAssignmentBatchSchema } from "@/lib/validation/assignment-schemas";

const setup = {
  protocolId: "11111111-1111-4111-8111-111111111111",
  routeId: "22222222-2222-4222-8222-222222222222",
  testerAServiceId: "33333333-3333-4333-8333-333333333333",
  testerBServiceId: "44444444-4444-4444-8444-444444444444",
  testingDate: "2026-08-10",
  startTime: "10:00",
  endTime: "14:00",
};

describe("assignment setup schema", () => {
  it("accepts a complete testing setup", () => {
    expect(assignmentSetupSchema.safeParse(setup).success).toBe(true);
  });

  it("rejects a window that does not end after it starts", () => {
    const result = assignmentSetupSchema.safeParse({ ...setup, endTime: setup.startTime });
    expect(result.success).toBe(false);
  });
});

describe("assignment tester pair schema", () => {
  it("accepts two distinct testers", () => {
    expect(assignmentTesterPairSchema.safeParse({ testerAId: setup.testerAServiceId, testerBId: setup.testerBServiceId }).success).toBe(true);
  });

  it("rejects one account in both tester slots", () => {
    expect(assignmentTesterPairSchema.safeParse({ testerAId: setup.testerAServiceId, testerBId: setup.testerAServiceId }).success).toBe(false);
  });
});

describe("asynchronous assignment windows", () => {
  const batch = {
    ...setup,
    studyId: "55555555-5555-4555-8555-555555555555",
    testerPairs: [{ testerAId: "66666666-6666-4666-8666-666666666666", testerBId: "77777777-7777-4777-8777-777777777777" }],
    timezone: "Asia/Manila",
    instructions: "",
  };

  it("accepts a separate valid Tester B window", () => {
    expect(createAssignmentBatchSchema.safeParse({ ...batch, testerBStartTime: "16:00", testerBEndTime: "18:00" }).success).toBe(true);
  });

  it("rejects an inverted Tester B window", () => {
    expect(createAssignmentBatchSchema.safeParse({ ...batch, testerBStartTime: "18:00", testerBEndTime: "16:00" }).success).toBe(false);
  });
});
