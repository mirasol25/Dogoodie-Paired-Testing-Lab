import { describe, expect, it } from "vitest";
import { activateProtocolSchema, createInitialProtocolSchema, createProtocolVersionSchema, discardProtocolDraftSchema, saveMatchingControlsSchema, saveProtocolDetailsSchema, saveProtocolExclusionsSchema, saveProtocolRequirementsSchema, saveValidationThresholdsSchema } from "@/lib/validation/protocol-schemas";

describe("initial protocol validation", () => {
  it("accepts protocol details and normalizes an empty description", () => {
    const result = createInitialProtocolSchema.parse({
      studyId: "00000000-0000-4000-8000-000000000001",
      title: "  Initial paired testing protocol  ",
      description: "",
      testerAValue: "Standard account",
      testerBValue: "Subscription account",
    });
    expect(result.title).toBe("Initial paired testing protocol");
    expect(result.description).toBeNull();
  });

  it("requires different isolated-variable values", () => {
    expect(createInitialProtocolSchema.safeParse({
      studyId: "00000000-0000-4000-8000-000000000001",
      title: "Initial protocol",
      testerAValue: "Standard account",
      testerBValue: " standard ACCOUNT ",
    }).success).toBe(false);
  });

  it("rejects invalid study identifiers and short titles", () => {
    expect(createInitialProtocolSchema.safeParse({ studyId: "study-1", title: "No" }).success).toBe(false);
  });
});

describe("protocol draft editing and versioning", () => {
  const identifiers = {
    studyId: "00000000-0000-4000-8000-000000000001",
    protocolId: "00000000-0000-4000-8000-000000000002",
  };

  it("accepts valid editable draft details", () => {
    expect(saveProtocolDetailsSchema.safeParse({
      ...identifiers,
      title: "Updated protocol",
      description: "Clarified comparison groups.",
      testerAValue: "Standard account",
      testerBValue: "Subscription account",
    }).success).toBe(true);
  });

  it("requires a useful change summary for a new version", () => {
    expect(createProtocolVersionSchema.safeParse({
      studyId: identifiers.studyId,
      sourceProtocolId: identifiers.protocolId,
      changeSummary: "Update evidence requirements",
    }).success).toBe(true);
    expect(createProtocolVersionSchema.safeParse({
      studyId: identifiers.studyId,
      sourceProtocolId: identifiers.protocolId,
      changeSummary: " ",
    }).success).toBe(false);
  });

  it("requires valid identifiers to discard a draft", () => {
    expect(discardProtocolDraftSchema.safeParse(identifiers).success).toBe(true);
    expect(discardProtocolDraftSchema.safeParse({ studyId: "study", protocolId: "protocol" }).success).toBe(false);
  });
});

describe("protocol activation validation", () => {
  it("requires valid study and protocol identifiers", () => {
    expect(activateProtocolSchema.safeParse({
      studyId: "00000000-0000-4000-8000-000000000001",
      protocolId: "00000000-0000-4000-8000-000000000002",
    }).success).toBe(true);
    expect(activateProtocolSchema.safeParse({ studyId: "study", protocolId: "protocol" }).success).toBe(false);
  });
});

describe("protocol exclusion validation", () => {
  const identifiers = {
    studyId: "00000000-0000-4000-8000-000000000001",
    protocolId: "00000000-0000-4000-8000-000000000002",
  };

  it("accepts supported operational exclusions", () => {
    expect(saveProtocolExclusionsSchema.safeParse({
      ...identifiers,
      optionalExclusions: ["outside_assignment_window", "declared_protocol_deviation"],
    }).success).toBe(true);
  });

  it("rejects unknown exclusions", () => {
    expect(saveProtocolExclusionsSchema.safeParse({
      ...identifiers,
      optionalExclusions: ["price_difference_detected"],
    }).success).toBe(false);
  });
});

describe("protocol requirement validation", () => {
  const identifiers = {
    studyId: "00000000-0000-4000-8000-000000000001",
    protocolId: "00000000-0000-4000-8000-000000000002",
  };

  it("accepts supported evidence and observation fields", () => {
    expect(saveProtocolRequirementsSchema.safeParse({
      ...identifiers,
      optionalEvidence: ["screen_recording", "gps_coordinates"],
      optionalObservationFields: ["estimated_arrival_time", "tester_notes"],
    }).success).toBe(true);
  });

  it("rejects unsupported requirements", () => {
    expect(saveProtocolRequirementsSchema.safeParse({
      ...identifiers,
      optionalEvidence: ["public_url"],
      optionalObservationFields: ["driver_name"],
    }).success).toBe(false);
  });
});

describe("protocol threshold validation", () => {
  const validThresholds = {
    studyId: "00000000-0000-4000-8000-000000000001",
    protocolId: "00000000-0000-4000-8000-000000000002",
    preferredTimeGapSeconds: 5,
    maximumTimeGapSeconds: 10,
    preferredLocationGapFeet: 5,
    maximumLocationGapFeet: 15,
  };

  it("accepts ordered positive thresholds", () => {
    expect(saveValidationThresholdsSchema.safeParse(validThresholds).success).toBe(true);
  });

  it("requires maximum values to exceed preferred values", () => {
    expect(saveValidationThresholdsSchema.safeParse({
      ...validThresholds,
      maximumTimeGapSeconds: 5,
      maximumLocationGapFeet: 4,
    }).success).toBe(false);
  });
});

describe("protocol matching-control validation", () => {
  const identifiers = {
    studyId: "00000000-0000-4000-8000-000000000001",
    protocolId: "00000000-0000-4000-8000-000000000002",
  };

  it("accepts supported optional controls", () => {
    expect(saveMatchingControlsSchema.safeParse({
      ...identifiers,
      optionalControls: ["operating_system_family", "app_version"],
    }).success).toBe(true);
  });

  it("rejects unknown controls", () => {
    expect(saveMatchingControlsSchema.safeParse({
      ...identifiers,
      optionalControls: ["account_membership"],
    }).success).toBe(false);
  });
});
