import { z } from "zod";

export const assignmentSetupSchema = z.object({
  protocolId: z.string().uuid("Select an active protocol."),
  routeId: z.string().uuid("Select a configured route."),
  testerAServiceId: z.string().uuid("Select the Tester A provider and ride tier."),
  testerBServiceId: z.string().uuid("Select the Tester B provider and ride tier."),
  testingDate: z.iso.date("Select a testing date."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Select a valid start time."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Select a valid end time."),
}).superRefine((values, context) => {
  if (values.endTime <= values.startTime) {
    context.addIssue({ code: "custom", path: ["endTime"], message: "The testing window must end after it starts on the same date." });
  }
});

export type AssignmentSetupInput = z.input<typeof assignmentSetupSchema>;

export const assignmentTesterPairSchema = z.object({
  testerAId: z.string().uuid("Select Tester A."),
  testerBId: z.string().uuid("Select Tester B."),
}).refine((values) => values.testerAId !== values.testerBId, {
  path: ["testerBId"],
  message: "Tester A and Tester B must be different people.",
});

export const createAssignmentSchema = assignmentSetupSchema.and(z.object({
  studyId: z.string().uuid(),
  testerAId: z.string().uuid(),
  testerBId: z.string().uuid(),
  timezone: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(1000).optional().transform((value) => value || null),
})).refine((values) => values.testerAId !== values.testerBId, {
  path: ["testerBId"],
  message: "Tester A and Tester B must be different people.",
});

export type CreateAssignmentInput = z.input<typeof createAssignmentSchema>;

export const createAssignmentBatchSchema = assignmentSetupSchema.and(z.object({
  studyId: z.string().uuid(),
  testerPairs: z.array(assignmentTesterPairSchema).min(1, "Add at least one tester pair.").max(50),
  timezone: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(1000).optional().transform((value) => value || null),
})).superRefine((values, context) => {
  const selected = values.testerPairs.flatMap((pair) => [pair.testerAId, pair.testerBId]);
  if (new Set(selected).size !== selected.length) {
    context.addIssue({ code: "custom", path: ["testerPairs"], message: "A tester can be assigned only once in a batch." });
  }
});

export type CreateAssignmentBatchInput = z.input<typeof createAssignmentBatchSchema>;
