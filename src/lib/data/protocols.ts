import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  activateProtocolSchema,
  createInitialProtocolSchema,
  saveMatchingControlsSchema,
  saveValidationThresholdsSchema,
  saveProtocolRequirementsSchema,
  saveProtocolExclusionsSchema,
  saveProtocolDetailsSchema,
  createProtocolVersionSchema,
  discardProtocolDraftSchema,
  type CreateInitialProtocolInput,
  type ActivateProtocolInput,
  type SaveMatchingControlsInput,
  type SaveValidationThresholdsInput,
  type SaveProtocolRequirementsInput,
  type SaveProtocolExclusionsInput,
  type SaveProtocolDetailsInput,
  type CreateProtocolVersionInput,
  type DiscardProtocolDraftInput,
} from "@/lib/validation/protocol-schemas";
import type { Database } from "@/types/database.types";

export type Protocol = Database["public"]["Tables"]["protocols"]["Row"];

export class ProtocolDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolDataError";
  }
}

export async function saveProtocolDetails(input: SaveProtocolDetailsInput, suppliedClient?: SupabaseClient<Database>): Promise<Protocol> {
  const parsed = saveProtocolDetailsSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError(parsed.error.issues[0]?.message || "Invalid protocol details.");
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("save_protocol_details", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_tester_a_value: parsed.data.testerAValue,
    p_tester_b_value: parsed.data.testerBValue,
  });
  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to edit this protocol.");
  if (error) throw new ProtocolDataError(error.message || "Protocol details could not be saved.");
  if (!data) throw new ProtocolDataError("The updated protocol was not returned.");
  return data;
}

export async function createProtocolVersion(input: CreateProtocolVersionInput, suppliedClient?: SupabaseClient<Database>): Promise<Protocol> {
  const parsed = createProtocolVersionSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError(parsed.error.issues[0]?.message || "Invalid version request.");
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("create_protocol_version", {
    p_study_id: parsed.data.studyId,
    p_source_protocol_id: parsed.data.sourceProtocolId,
    p_change_summary: parsed.data.changeSummary,
  });
  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to create a protocol version.");
  if (error?.code === "23505") throw new ProtocolDataError("A draft protocol version already exists.");
  if (error) throw new ProtocolDataError(error.message || "The new protocol version could not be created.");
  if (!data) throw new ProtocolDataError("The new protocol version was not returned.");
  return data;
}

export async function discardProtocolDraft(input: DiscardProtocolDraftInput, suppliedClient?: SupabaseClient<Database>): Promise<string> {
  const parsed = discardProtocolDraftSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError("Invalid draft deletion request.");
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("discard_protocol_draft", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
  });
  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to discard this draft.");
  if (error) throw new ProtocolDataError(error.message || "The protocol draft could not be discarded.");
  if (!data) throw new ProtocolDataError("The discarded protocol version was not returned.");
  return data;
}

export async function listStudyProtocols(
  studyId: string,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Protocol[]> {
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("*")
    .eq("study_id", studyId)
    .order("created_at", { ascending: false });

  if (error) throw new ProtocolDataError("Protocols could not be loaded.");
  return data;
}

export function getActiveProtocol(protocols: Protocol[]): Protocol | null {
  return protocols.find((protocol) => protocol.status === "active") ?? null;
}

export async function createInitialProtocol(
  input: CreateInitialProtocolInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Protocol> {
  const parsed = createInitialProtocolSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError(parsed.error.issues[0]?.message || "Invalid protocol details.");

  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("create_initial_protocol_draft", {
    p_study_id: parsed.data.studyId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_tester_a_value: parsed.data.testerAValue,
    p_tester_b_value: parsed.data.testerBValue,
  });

  if (error?.code === "23505") throw new ProtocolDataError("The initial protocol already exists.");
  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to create this protocol.");
  if (error) throw new ProtocolDataError(error.message || "The protocol draft could not be created.");
  if (!data) throw new ProtocolDataError("The protocol draft was not returned after creation.");
  return data;
}

export async function saveProtocolMatchingControls(
  input: SaveMatchingControlsInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Protocol> {
  const parsed = saveMatchingControlsSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError(parsed.error.issues[0]?.message || "Invalid matching controls.");

  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("save_protocol_matching_controls", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
    p_optional_controls: parsed.data.optionalControls,
  });

  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to edit this protocol.");
  if (error) throw new ProtocolDataError(error.message || "Matching controls could not be saved.");
  if (!data) throw new ProtocolDataError("The updated protocol was not returned.");
  return data;
}

export async function saveProtocolValidationThresholds(
  input: SaveValidationThresholdsInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Protocol> {
  const parsed = saveValidationThresholdsSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError(parsed.error.issues[0]?.message || "Invalid validation thresholds.");

  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("save_protocol_validation_thresholds", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
    p_preferred_time_gap_seconds: parsed.data.preferredTimeGapSeconds,
    p_maximum_time_gap_seconds: parsed.data.maximumTimeGapSeconds,
    p_preferred_location_gap_feet: parsed.data.preferredLocationGapFeet,
    p_maximum_location_gap_feet: parsed.data.maximumLocationGapFeet,
  });

  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to edit this protocol.");
  if (error) throw new ProtocolDataError(error.message || "Validation thresholds could not be saved.");
  if (!data) throw new ProtocolDataError("The updated protocol was not returned.");
  return data;
}

export async function saveProtocolRequirements(
  input: SaveProtocolRequirementsInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Protocol> {
  const parsed = saveProtocolRequirementsSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError(parsed.error.issues[0]?.message || "Invalid protocol requirements.");
  const uniqueObservationFields = [...new Set(parsed.data.optionalObservationFields)];
  if (uniqueObservationFields.length !== parsed.data.optionalObservationFields.length) {
    throw new ProtocolDataError("Observation requirements cannot contain duplicates.");
  }

  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("save_protocol_evidence_observation_requirements", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
    p_optional_evidence: parsed.data.optionalEvidence,
    p_optional_observation_fields: uniqueObservationFields,
  });

  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to edit this protocol.");
  if (error) throw new ProtocolDataError(error.message || "Protocol requirements could not be saved.");
  if (!data) throw new ProtocolDataError("The updated protocol was not returned.");
  return data;
}

export async function saveProtocolExclusions(
  input: SaveProtocolExclusionsInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Protocol> {
  const parsed = saveProtocolExclusionsSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError(parsed.error.issues[0]?.message || "Invalid exclusion conditions.");

  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("save_protocol_exclusion_conditions", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
    p_optional_exclusions: parsed.data.optionalExclusions,
  });

  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to edit this protocol.");
  if (error) throw new ProtocolDataError(error.message || "Exclusion conditions could not be saved.");
  if (!data) throw new ProtocolDataError("The updated protocol was not returned.");
  return data;
}

export async function activateProtocol(
  input: ActivateProtocolInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Protocol> {
  const parsed = activateProtocolSchema.safeParse(input);
  if (!parsed.success) throw new ProtocolDataError("Invalid protocol activation request.");

  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("activate_protocol", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
  });

  if (error?.code === "42501") throw new ProtocolDataError("You are not authorized to activate this protocol.");
  if (error) throw new ProtocolDataError(error.message || "The protocol could not be activated.");
  if (!data) throw new ProtocolDataError("The activated protocol was not returned.");
  return data;
}
