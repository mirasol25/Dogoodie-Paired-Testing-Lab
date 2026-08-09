import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { createAssignmentBatchSchema, createAssignmentSchema, type CreateAssignmentBatchInput, type CreateAssignmentInput } from "@/lib/validation/assignment-schemas";
import { getStudyCollectionCapacity } from "@/lib/data/collection-capacity";
import { submissionDraftSchema, type SubmissionDraftInput } from "@/lib/validation/submission-schemas";
import { registerEvidenceSchema, type RegisterEvidenceInput } from "@/lib/validation/evidence-schemas";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
export type EvidenceRow = Database["public"]["Tables"]["evidence_files"]["Row"];
type TesterSlot = Database["public"]["Enums"]["tester_slot"];

export interface AssignmentTesterSummary {
  slot: TesterSlot;
  userId: string;
  displayName: string;
  email: string;
  status: Database["public"]["Enums"]["assignment_tester_status"];
  serviceName: string | null;
  platformName: string | null;
  protocolValue: string | null;
}

export interface AssignmentSummary extends AssignmentRow {
  protocolCode: string;
  protocolVersion: string;
  testers: AssignmentTesterSummary[];
  protocolFixedControls: Database["public"]["Tables"]["protocols"]["Row"]["fixed_controls"];
  protocolEvidenceRequirements: Database["public"]["Tables"]["protocols"]["Row"]["evidence_requirements"];
}

export interface AssignmentRouteOption {
  id: string;
  name: string;
  pickup: string;
  destination: string;
  timezone: string;
}

export interface AssignmentServiceOption {
  id: string;
  platformId: string;
  platformName: string;
  serviceName: string;
  normalizedCategory: string;
}

export interface AssignmentProtocolOption {
  id: string;
  code: string;
  version: string;
  title: string;
  isolatedVariable: string;
  testerAValue: string;
  testerBValue: string;
}

export interface AssignmentTesterOption {
  id: string;
  displayName: string;
  email: string;
  deviceType: string | null;
  operatingSystem: string | null;
  operatingSystemVersion: string | null;
}

export interface AssignmentSetupOptions {
  routes: AssignmentRouteOption[];
  services: AssignmentServiceOption[];
  protocols: AssignmentProtocolOption[];
}

export async function listAssignmentTesterOptions(
  studyId: string,
  suppliedClient?: SupabaseClient<Database>,
): Promise<AssignmentTesterOption[]> {
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("list_assignment_tester_options", { p_study_id: studyId });
  if (error) throw new AssignmentDataError(error.message || "Eligible assignment testers could not be loaded.");
  return data.map((tester) => ({
    id: tester.user_id,
    displayName: tester.display_name?.trim() || tester.email,
    email: tester.email,
    deviceType: tester.device_type,
    operatingSystem: tester.operating_system,
    operatingSystemVersion: tester.operating_system_version,
  }));
}

export class AssignmentDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssignmentDataError";
  }
}

export interface AssignmentOperationalSummary {
  submissions: Array<{ id: string; userId: string; status: SubmissionRow["status"]; submittedAt: string | null; evidenceCount: number; completeEvidenceCount: number }>;
  pair: { id: string; pairCode: string; technicalStatus: string; evidenceStatus: string } | null;
}

export async function cancelAssignment(assignmentId: string, reason: string): Promise<AssignmentRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_assignment", { p_assignment_id: assignmentId, p_reason: reason });
  if (error) throw new AssignmentDataError(error.message || "The assignment could not be cancelled.");
  if (!data) throw new AssignmentDataError("The cancelled assignment was not returned.");
  return data;
}

export async function expireOverdueAssignments(studyId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("expire_overdue_assignments", { p_study_id: studyId });
  if (error) throw new AssignmentDataError(error.message || "Overdue assignments could not be processed.");
  return data ?? 0;
}

export async function getAssignmentOperationalSummary(assignmentId: string): Promise<AssignmentOperationalSummary> {
  const supabase = await createClient();
  const [submissionResult, pairResult] = await Promise.all([
    supabase.from("submissions").select("id,user_id,status,submitted_at").eq("assignment_id", assignmentId),
    supabase.from("matched_pairs").select("id,pair_code,technical_status,evidence_status").eq("assignment_id", assignmentId).maybeSingle(),
  ]);
  if (submissionResult.error || pairResult.error) throw new AssignmentDataError("Assignment progress could not be loaded.");
  const submissionIds = submissionResult.data.map((submission) => submission.id);
  const evidenceResult = submissionIds.length
    ? await supabase.from("evidence_files").select("submission_id,integrity_status").in("submission_id", submissionIds)
    : { data: [], error: null };
  if (evidenceResult.error) throw new AssignmentDataError("Assignment evidence progress could not be loaded.");
  return {
    submissions: submissionResult.data.map((submission) => {
      const files = evidenceResult.data.filter((file) => file.submission_id === submission.id);
      return { id: submission.id, userId: submission.user_id, status: submission.status, submittedAt: submission.submitted_at, evidenceCount: files.length, completeEvidenceCount: files.filter((file) => file.integrity_status === "complete").length };
    }),
    pair: pairResult.data ? { id: pairResult.data.id, pairCode: pairResult.data.pair_code, technicalStatus: pairResult.data.technical_status, evidenceStatus: pairResult.data.evidence_status } : null,
  };
}

export async function createAssignment(input: CreateAssignmentInput): Promise<AssignmentRow> {
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) throw new AssignmentDataError(parsed.error.issues[0]?.message || "Invalid assignment.");
  const capacity = await getStudyCollectionCapacity(parsed.data.studyId);
  if (!capacity.canCreate) throw new AssignmentDataError(`The study target is already covered by ${capacity.coverage} pair${capacity.coverage === 1 ? "" : "s"}. Wait for a reviewer decision or create a replacement after a rejection.`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_paired_assignment", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
    p_route_id: parsed.data.routeId,
    p_tester_a_id: parsed.data.testerAId,
    p_tester_b_id: parsed.data.testerBId,
    p_tester_a_service_id: parsed.data.testerAServiceId,
    p_tester_b_service_id: parsed.data.testerBServiceId,
    p_testing_date: parsed.data.testingDate,
    p_start_time: parsed.data.startTime,
    p_end_time: parsed.data.endTime,
    p_timezone: parsed.data.timezone,
    p_instructions: parsed.data.instructions,
  });
  if (error) throw new AssignmentDataError(error.message || "The assignment could not be created.");
  if (!data) throw new AssignmentDataError("The created assignment was not returned.");
  return data;
}

export async function createAssignmentBatch(input: CreateAssignmentBatchInput): Promise<AssignmentRow[]> {
  const parsed = createAssignmentBatchSchema.safeParse(input);
  if (!parsed.success) throw new AssignmentDataError(parsed.error.issues[0]?.message || "Invalid assignment batch.");
  const capacity = await getStudyCollectionCapacity(parsed.data.studyId);
  if (!capacity.canCreate) throw new AssignmentDataError("The study target is already covered by accepted, pending-review, or active paired sessions.");
  if (capacity.target !== null && parsed.data.testerPairs.length > capacity.assignmentsNeeded) {
    throw new AssignmentDataError(`Only ${capacity.assignmentsNeeded} assignment ${capacity.assignmentsNeeded === 1 ? "slot" : "slots"} remain for this study target.`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_paired_assignment_batch", {
    p_study_id: parsed.data.studyId,
    p_protocol_id: parsed.data.protocolId,
    p_route_id: parsed.data.routeId,
    p_tester_pairs: parsed.data.testerPairs.map((pair) => ({ tester_a_id: pair.testerAId, tester_b_id: pair.testerBId })),
    p_tester_a_service_id: parsed.data.testerAServiceId,
    p_tester_b_service_id: parsed.data.testerBServiceId,
    p_testing_date: parsed.data.testingDate,
    p_start_time: parsed.data.startTime,
    p_end_time: parsed.data.endTime,
    p_timezone: parsed.data.timezone,
    p_instructions: parsed.data.instructions,
  });
  if (error) throw new AssignmentDataError(error.message || "The assignment batch could not be created.");
  if (!data?.length) throw new AssignmentDataError("The assignment batch was not returned.");
  return data;
}

export async function listStudyAssignments(
  studyId: string,
  suppliedClient?: SupabaseClient<Database>,
): Promise<AssignmentSummary[]> {
  const supabase = suppliedClient ?? await createClient();
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("*,protocols(protocol_code,version,fixed_controls,evidence_requirements)")
    .eq("study_id", studyId)
    .order("scheduled_start", { ascending: false, nullsFirst: false });

  if (error) throw new AssignmentDataError("Assignments could not be loaded.");
  if (!assignments.length) return [];

  const assignmentIds = assignments.map((assignment) => assignment.id);
  const { data: slots, error: slotsError } = await supabase
    .from("assignment_testers")
    .select("assignment_id,user_id,slot,status,platform_service_id,account_configuration")
    .in("assignment_id", assignmentIds);
  if (slotsError) throw new AssignmentDataError("Assignment tester slots could not be loaded.");

  const serviceIds = [...new Set(slots.flatMap((slot) => slot.platform_service_id ? [slot.platform_service_id] : []))];
  const [rosterResult, servicesResult] = await Promise.all([
    supabase.rpc("list_assignment_pair_roster", { p_study_id: studyId }),
    serviceIds.length
      ? supabase.from("platform_services").select("id,name,platform_id").in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (rosterResult.error || servicesResult.error) {
    throw new AssignmentDataError("Assignment details could not be loaded.");
  }

  const platformIds = [...new Set(servicesResult.data.map((service) => service.platform_id))];
  const { data: platformRows, error: platformError } = platformIds.length
    ? await supabase.from("platforms").select("id,name").in("id", platformIds)
    : { data: [], error: null };
  if (platformError) throw new AssignmentDataError("Assignment provider details could not be loaded.");
  const roster = new Map(rosterResult.data.map((profile) => [`${profile.assignment_id}:${profile.user_id}`, profile]));
  const platforms = new Map(platformRows.map((platform) => [platform.id, platform.name]));
  const services = new Map(servicesResult.data.map((service) => [service.id, service]));
  return assignments.map((assignment) => ({
    ...assignment,
    protocolCode: assignment.protocols.protocol_code,
    protocolVersion: assignment.protocols.version,
    protocolFixedControls: assignment.protocols.fixed_controls,
    protocolEvidenceRequirements: assignment.protocols.evidence_requirements,
    testers: rosterResult.data
      .filter((entry) => entry.assignment_id === assignment.id)
      .map((entry) => {
        const slot = slots.find((candidate) => candidate.assignment_id === entry.assignment_id && candidate.user_id === entry.user_id);
        const profile = roster.get(`${entry.assignment_id}:${entry.user_id}`);
        return {
          slot: entry.slot,
          userId: entry.user_id,
          displayName: profile?.display_name?.trim() || profile?.email || "Unavailable tester",
          email: profile?.email ?? "",
          status: entry.slot_status,
          serviceName: slot?.platform_service_id ? services.get(slot.platform_service_id)?.name ?? null : null,
          platformName: slot?.platform_service_id ? platforms.get(services.get(slot.platform_service_id)?.platform_id ?? "") ?? null : null,
          protocolValue: slot?.account_configuration && typeof slot.account_configuration === "object" && !Array.isArray(slot.account_configuration) && typeof slot.account_configuration.protocol_value === "string" ? slot.account_configuration.protocol_value : null,
        };
      }),
  }));
}

export async function getStudyAssignment(studyId: string, assignmentId: string): Promise<AssignmentSummary | null> {
  const assignments = await listStudyAssignments(studyId);
  return assignments.find((assignment) => assignment.id === assignmentId) ?? null;
}

export async function getAccessibleAssignmentStudyId(assignmentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assignments").select("study_id").eq("id", assignmentId).maybeSingle();
  if (error) throw new AssignmentDataError("The assignment could not be loaded.");
  return data?.study_id ?? null;
}

export async function getOwnAssignmentSubmission(assignmentId: string, userId: string): Promise<SubmissionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("submissions").select("*").eq("assignment_id", assignmentId).eq("user_id", userId).maybeSingle();
  if (error) throw new AssignmentDataError("The submission draft could not be loaded.");
  return data;
}

export async function getLatestTesterTechnicalProfile(userId: string): Promise<Pick<SubmissionRow, "network_type" | "device_type" | "operating_system" | "operating_system_version" | "app_version"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("network_type,device_type,operating_system,operating_system_version,app_version")
    .eq("id", userId)
    .maybeSingle();
  // Allow the assignment screen to remain usable while a deployment is
  // catching up with the profile-device migration. Once the columns exist,
  // normal persistent-profile loading resumes automatically.
  if (error && (error.code === "42703" || /(?:network_type|device_type|operating_system|app_version)/i.test(error.message))) return null;
  if (error) throw new AssignmentDataError("Your saved device profile could not be loaded.");
  // Values are independently reusable. A newly added field should not hide
  // the rest of a tester's saved profile just because that one value is blank.
  if (!data) return null;
  return data;
}

export async function confirmAssignmentReady(assignmentId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_assignment_ready", { p_assignment_id: assignmentId });
  if (error) throw new AssignmentDataError(error.message || "Readiness could not be confirmed.");
}

export async function startAssignmentTest(assignmentId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_assignment_test", { p_assignment_id: assignmentId });
  if (error) throw new AssignmentDataError(error.message || "The test could not be started.");
}

export async function saveSubmissionDraft(input: SubmissionDraftInput): Promise<SubmissionRow> {
  const parsed = submissionDraftSchema.safeParse(input);
  if (!parsed.success) throw new AssignmentDataError(parsed.error.issues[0]?.message || "Invalid submission draft.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_submission_draft", {
    p_assignment_id: parsed.data.assignmentId,
    p_displayed_fare: parsed.data.displayedFare,
    p_quote_timestamp: parsed.data.quoteTimestamp,
    p_latitude: parsed.data.latitude,
    p_longitude: parsed.data.longitude,
    p_network_type: parsed.data.networkType,
    p_device_type: parsed.data.deviceType,
    p_operating_system: parsed.data.operatingSystem,
    p_operating_system_version: parsed.data.operatingSystemVersion,
    p_app_version: parsed.data.appVersion,
    p_battery_percentage: parsed.data.batteryPercentage,
    p_notes: parsed.data.notes,
  });
  if (error) throw new AssignmentDataError(error.message || "The submission draft could not be saved.");
  if (!data) throw new AssignmentDataError("The saved submission was not returned.");
  return data;
}

export async function getOwnSubmissionEvidence(submissionId: string | null, userId: string): Promise<EvidenceRow[]> {
  if (!submissionId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("evidence_files").select("*").eq("submission_id", submissionId).eq("uploaded_by", userId).order("created_at");
  if (error) throw new AssignmentDataError("Submission evidence could not be loaded.");
  return data;
}

export async function registerSubmissionEvidence(input: RegisterEvidenceInput): Promise<EvidenceRow> {
  const parsed = registerEvidenceSchema.safeParse(input);
  if (!parsed.success) throw new AssignmentDataError(parsed.error.issues[0]?.message || "Invalid evidence metadata.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_submission_evidence", {
    p_submission_id: parsed.data.submissionId, p_evidence_type: parsed.data.evidenceType,
    p_storage_path: parsed.data.storagePath, p_original_filename: parsed.data.originalFilename,
    p_mime_type: parsed.data.mimeType, p_size_bytes: parsed.data.sizeBytes, p_sha256: parsed.data.sha256,
    p_captured_at: parsed.data.capturedAt,
  });
  if (error) throw new AssignmentDataError(error.message || "Evidence could not be registered.");
  if (!data) throw new AssignmentDataError("The registered evidence was not returned.");
  return data;
}

export async function submitTesterObservation(assignmentId: string): Promise<SubmissionRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_tester_observation", { p_assignment_id: assignmentId });
  if (error) throw new AssignmentDataError(error.message || "The observation could not be submitted.");
  if (!data) throw new AssignmentDataError("The submitted observation was not returned.");
  return data;
}

export async function getAssignmentSetupOptions(
  studyId: string,
  studyConfiguration: Database["public"]["Tables"]["studies"]["Row"]["configuration"],
  suppliedClient?: SupabaseClient<Database>,
): Promise<AssignmentSetupOptions> {
  const supabase = suppliedClient ?? await createClient();
  const configuration = studyConfiguration && typeof studyConfiguration === "object" && !Array.isArray(studyConfiguration)
    ? studyConfiguration as Record<string, unknown>
    : {};
  const serviceIds = Array.isArray(configuration.platform_service_ids)
    ? [...new Set(configuration.platform_service_ids.filter((id): id is string => typeof id === "string"))]
    : [];

  const [routesResult, protocolsResult, servicesResult] = await Promise.all([
    supabase.from("study_routes").select("id,route_name,pickup_location_id,destination_location_id").eq("study_id", studyId).eq("is_active", true).order("created_at"),
    supabase.from("protocols").select("id,protocol_code,version,title,isolated_variable,tester_a_value,tester_b_value").eq("study_id", studyId).eq("status", "active").order("effective_at", { ascending: false }),
    serviceIds.length
      ? supabase.from("platform_services").select("id,platform_id,name,normalized_service_category").in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (routesResult.error || protocolsResult.error || servicesResult.error) {
    throw new AssignmentDataError("Assignment setup options could not be loaded.");
  }

  const locationIds = [...new Set(routesResult.data.flatMap((route) => [route.pickup_location_id, route.destination_location_id]))];
  const platformIds = [...new Set(servicesResult.data.map((service) => service.platform_id))];
  const [locationsResult, platformsResult] = await Promise.all([
    locationIds.length
      ? supabase.from("study_locations").select("id,label,formatted_address,timezone").in("id", locationIds)
      : Promise.resolve({ data: [], error: null }),
    platformIds.length
      ? supabase.from("platforms").select("id,name").in("id", platformIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (locationsResult.error || platformsResult.error) throw new AssignmentDataError("Route and provider details could not be loaded.");
  const locations = new Map(locationsResult.data.map((location) => [location.id, location]));
  const platforms = new Map(platformsResult.data.map((platform) => [platform.id, platform.name]));

  return {
    routes: routesResult.data.map((route) => ({
      id: route.id,
      name: route.route_name,
      pickup: locations.get(route.pickup_location_id)?.label || locations.get(route.pickup_location_id)?.formatted_address || "Pickup unavailable",
      destination: locations.get(route.destination_location_id)?.label || locations.get(route.destination_location_id)?.formatted_address || "Destination unavailable",
      timezone: locations.get(route.pickup_location_id)?.timezone || "UTC",
    })),
    protocols: protocolsResult.data.map((protocol) => ({ id: protocol.id, code: protocol.protocol_code, version: protocol.version, title: protocol.title, isolatedVariable: protocol.isolated_variable ?? "Protocol condition", testerAValue: protocol.tester_a_value ?? "Not configured", testerBValue: protocol.tester_b_value ?? "Not configured" })),
    services: serviceIds.flatMap((id) => {
      const service = servicesResult.data.find((item) => item.id === id);
      return service ? [{ id: service.id, platformId: service.platform_id, platformName: platforms.get(service.platform_id) ?? "Unknown provider", serviceName: service.name, normalizedCategory: service.normalized_service_category }] : [];
    }),
  };
}
