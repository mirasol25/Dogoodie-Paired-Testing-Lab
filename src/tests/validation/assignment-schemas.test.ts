import { describe, expect, it } from "vitest";
import { assignmentSetupSchema, assignmentTesterPairSchema } from "@/lib/validation/assignment-schemas";

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
