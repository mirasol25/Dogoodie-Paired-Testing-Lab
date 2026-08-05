import { z } from "zod";

export const createInitialProtocolSchema = z.object({
  studyId: z.string().uuid(),
  title: z.string().trim().min(3, "Enter a protocol title.").max(160),
  description: z.string().trim().max(1000).optional().transform((value) => value || null),
  testerAValue: z.string().trim().min(2, "Enter the Tester A value.").max(120),
  testerBValue: z.string().trim().min(2, "Enter the Tester B value.").max(120),
}).superRefine((value, context) => {
  if (value.testerAValue.toLocaleLowerCase() === value.testerBValue.toLocaleLowerCase()) {
    context.addIssue({ code: "custom", path: ["testerBValue"], message: "Tester B must have a different isolated-variable value." });
  }
});

export type CreateInitialProtocolInput = z.input<typeof createInitialProtocolSchema>;

export const saveProtocolDetailsSchema = z.object({
  studyId: z.string().uuid(),
  protocolId: z.string().uuid(),
  title: z.string().trim().min(3, "Enter a protocol title.").max(160),
  description: z.string().trim().max(1000).optional().transform((value) => value || null),
  testerAValue: z.string().trim().min(2, "Enter the Tester A value.").max(120),
  testerBValue: z.string().trim().min(2, "Enter the Tester B value.").max(120),
}).superRefine((value, context) => {
  if (value.testerAValue.toLocaleLowerCase() === value.testerBValue.toLocaleLowerCase()) {
    context.addIssue({ code: "custom", path: ["testerBValue"], message: "Tester B must have a different isolated-variable value." });
  }
});

export type SaveProtocolDetailsInput = z.input<typeof saveProtocolDetailsSchema>;

export const createProtocolVersionSchema = z.object({
  studyId: z.string().uuid(),
  sourceProtocolId: z.string().uuid(),
  changeSummary: z.string().trim().min(3, "Describe why a new version is needed.").max(500),
});

export type CreateProtocolVersionInput = z.input<typeof createProtocolVersionSchema>;

export const discardProtocolDraftSchema = z.object({
  studyId: z.string().uuid(),
  protocolId: z.string().uuid(),
});

export type DiscardProtocolDraftInput = z.input<typeof discardProtocolDraftSchema>;

export const optionalMatchingControlSchema = z.enum([
  "operating_system_family",
  "app_version",
  "device_model",
  "network_category",
]);

export const saveMatchingControlsSchema = z.object({
  studyId: z.string().uuid(),
  protocolId: z.string().uuid(),
  optionalControls: z.array(optionalMatchingControlSchema).max(4),
});

export type SaveMatchingControlsInput = z.input<typeof saveMatchingControlsSchema>;

export const saveValidationThresholdsSchema = z.object({
  studyId: z.string().uuid(),
  protocolId: z.string().uuid(),
  preferredTimeGapSeconds: z.number().int().min(1).max(3599),
  maximumTimeGapSeconds: z.number().int().min(2).max(3600),
  preferredLocationGapFeet: z.number().int().min(1).max(5279),
  maximumLocationGapFeet: z.number().int().min(2).max(5280),
}).superRefine((value, context) => {
  if (value.maximumTimeGapSeconds <= value.preferredTimeGapSeconds) {
    context.addIssue({ code: "custom", path: ["maximumTimeGapSeconds"], message: "Maximum time gap must exceed the preferred gap." });
  }
  if (value.maximumLocationGapFeet <= value.preferredLocationGapFeet) {
    context.addIssue({ code: "custom", path: ["maximumLocationGapFeet"], message: "Maximum location gap must exceed the preferred gap." });
  }
});

export type SaveValidationThresholdsInput = z.input<typeof saveValidationThresholdsSchema>;

export const optionalEvidenceSchema = z.enum(["screen_recording", "gps_coordinates"]);
export const optionalObservationFieldSchema = z.enum([
  "estimated_arrival_time",
  "availability",
  "price_breakdown",
  "tester_notes",
  "app_version",
  "device_model",
  "operating_system_family",
  "network_category",
  "account_age_membership",
]);

export const saveProtocolRequirementsSchema = z.object({
  studyId: z.string().uuid(),
  protocolId: z.string().uuid(),
  optionalEvidence: z.array(optionalEvidenceSchema).max(3),
  optionalObservationFields: z.array(optionalObservationFieldSchema).max(9),
});

export type SaveProtocolRequirementsInput = z.input<typeof saveProtocolRequirementsSchema>;

export const optionalExclusionSchema = z.enum([
  "outside_assignment_window",
  "declared_protocol_deviation",
  "evidence_timestamp_mismatch",
  "duplicate_evidence",
]);

export const saveProtocolExclusionsSchema = z.object({
  studyId: z.string().uuid(),
  protocolId: z.string().uuid(),
  optionalExclusions: z.array(optionalExclusionSchema).max(4),
});

export type SaveProtocolExclusionsInput = z.input<typeof saveProtocolExclusionsSchema>;

export const activateProtocolSchema = z.object({
  studyId: z.string().uuid(),
  protocolId: z.string().uuid(),
});

export type ActivateProtocolInput = z.input<typeof activateProtocolSchema>;
