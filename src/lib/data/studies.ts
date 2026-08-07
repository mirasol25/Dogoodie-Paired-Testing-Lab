import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  createStudySchema,
  createStudyWithRouteSchema,
  type CreateStudyInput,
  type CreateStudyWithRouteInput,
} from "@/lib/validation/study-schemas";
import type { Database } from "@/types/database.types";

export type Study = Database["public"]["Tables"]["studies"]["Row"];

export interface ProviderServiceOption {
  id: string;
  platformId: string;
  platformName: string;
  serviceName: string;
  normalizedCategory: string;
  countryCode: string;
}

export interface ReviewerStudyWorkload {
  studyId: string;
  total: number;
  pending: number;
  accepted: number;
  acceptedWithException: number;
  rejected: number;
}

export interface StudyCompletionReadiness {
  ready: boolean;
  assignments: { total: number; completed: number; cancelled: number; expired: number; unfinished: number };
  pairs: { total: number; technically_processed: number; missing_for_completed_assignments: number; accepted_usable: number; replacement_needed: number };
  evidence: { complete: number; required: number };
  reviews: { pending: number; accepted: number; accepted_with_exception: number; flagged: number; rejected: number };
  blockers: string[];
}

export async function getStudyCompletionReadiness(studyId: string): Promise<StudyCompletionReadiness> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_study_completion_readiness", { p_study_id: studyId });
  if (error) throw new StudyDataError(error.message || "Completion readiness could not be loaded.", "DATABASE");
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new StudyDataError("Completion readiness was invalid.", "DATABASE");
  return data as unknown as StudyCompletionReadiness;
}

export async function listReviewerStudyWorkloads(studyIds: string[], reviewerId: string): Promise<ReviewerStudyWorkload[]> {
  if (!studyIds.length) return [];
  const supabase = await createClient();
  const { data: pairs, error: pairError } = await supabase.from("matched_pairs").select("id,study_id").in("study_id", studyIds);
  if (pairError) throw new StudyDataError("Reviewer workloads could not be loaded.", "DATABASE");
  const pairIds = pairs.map((pair) => pair.id);
  const reviews = pairIds.length
    ? await supabase.from("expert_reviews").select("matched_pair_id,status,technical_exception").eq("reviewer_id", reviewerId).in("matched_pair_id", pairIds)
    : { data: [], error: null };
  if (reviews.error) throw new StudyDataError("Reviewer decisions could not be loaded.", "DATABASE");
  const reviewByPair = new Map(reviews.data.map((review) => [review.matched_pair_id, review]));
  return studyIds.map((studyId) => {
    const studyPairs = pairs.filter((pair) => pair.study_id === studyId);
    return {
      studyId,
      total: studyPairs.length,
      pending: studyPairs.filter((pair) => !reviewByPair.has(pair.id) || reviewByPair.get(pair.id)?.status === "pending").length,
      accepted: studyPairs.filter((pair) => reviewByPair.get(pair.id)?.status === "accepted" && !reviewByPair.get(pair.id)?.technical_exception).length,
      acceptedWithException: studyPairs.filter((pair) => reviewByPair.get(pair.id)?.status === "accepted" && reviewByPair.get(pair.id)?.technical_exception).length,
      rejected: studyPairs.filter((pair) => reviewByPair.get(pair.id)?.status === "rejected").length,
    };
  });
}

export class StudyDataError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "DUPLICATE_CODE" | "FORBIDDEN" | "DATABASE",
  ) {
    super(message);
    this.name = "StudyDataError";
  }
}

export async function listAccessibleStudies(
  suppliedClient?: SupabaseClient<Database>,
): Promise<Study[]> {
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase
    .from("studies")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new StudyDataError("Studies could not be loaded.", "DATABASE");
  return data;
}

export async function getAccessibleStudyById(
  studyId: string,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Study | null> {
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.from("studies").select("*").eq("id", studyId).maybeSingle();
  if (error) throw new StudyDataError("The study could not be loaded.", "DATABASE");
  return data;
}

export async function transitionStudyStatus(
  studyId: string,
  status: Study["status"],
  suppliedClient?: SupabaseClient<Database>,
): Promise<Study> {
  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("transition_study_status", {
    p_study_id: studyId,
    p_new_status: status,
  });
  if (error) {
    if (error.code === "42501") throw new StudyDataError(error.message || "You cannot change this study status.", "FORBIDDEN");
    throw new StudyDataError(error.message || "The study status could not be changed.", "VALIDATION");
  }
  if (!data) throw new StudyDataError("The updated study was not returned.", "DATABASE");
  return data;
}

export async function extendStudyTestingPeriod(studyId: string, testingEndsAt: string): Promise<Study> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("extend_study_testing_period", { p_study_id: studyId, p_testing_ends_at: testingEndsAt });
  if (error) {
    if (error.code === "42501") throw new StudyDataError(error.message || "You cannot extend this study.", "FORBIDDEN");
    throw new StudyDataError(error.message || "The testing period could not be extended.", "VALIDATION");
  }
  if (!data) throw new StudyDataError("The updated study was not returned.", "DATABASE");
  return data;
}

export async function listProviderServiceOptions(
  suppliedClient?: SupabaseClient<Database>,
): Promise<ProviderServiceOption[]> {
  const supabase = suppliedClient ?? await createClient();
  const [marketsResult, platformsResult, servicesResult] = await Promise.all([
    supabase.from("provider_markets").select("platform_id,country_code").eq("is_active", true),
    supabase.from("platforms").select("id,name").eq("is_active", true),
    supabase.from("platform_services").select("id,platform_id,name,normalized_service_category").eq("is_active", true),
  ]);
  if (marketsResult.error || platformsResult.error || servicesResult.error) return [];
  const names = new Map(platformsResult.data.map((platform) => [platform.id, platform.name]));
  const markets = new Map<string, string[]>();
  marketsResult.data.forEach((market) => markets.set(market.platform_id, [...(markets.get(market.platform_id) ?? []), market.country_code]));
  return servicesResult.data.flatMap((service) => (markets.get(service.platform_id) ?? []).map((countryCode) => ({
    id: service.id,
    platformId: service.platform_id,
    platformName: names.get(service.platform_id) ?? "Unknown provider",
    serviceName: service.name,
    normalizedCategory: service.normalized_service_category,
    countryCode,
  })));
}

export async function createStudy(
  input: CreateStudyInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Study> {
  const parsed = createStudySchema.safeParse(input);
  if (!parsed.success) throw new StudyDataError(parsed.error.issues[0]?.message || "Invalid study.", "VALIDATION");

  const supabase = suppliedClient ?? await createClient();
  const { data, error } = await supabase.rpc("create_study", {
    p_study_code: parsed.data.studyCode,
    p_name: parsed.data.name,
    p_study_type: parsed.data.studyType,
    p_default_currency: parsed.data.defaultCurrency,
    p_display_timezone: parsed.data.displayTimezone,
    p_description: parsed.data.description,
    p_study_question: parsed.data.studyQuestion,
    p_isolated_variable: parsed.data.isolatedVariable,
    p_target_pair_count: parsed.data.targetPairCount,
    p_testing_starts_at: parsed.data.testingStartsAt,
    p_testing_ends_at: parsed.data.testingEndsAt,
    p_configuration: {},
  });

  if (error) {
    if (error.code === "23505") throw new StudyDataError("That study code is already in use.", "DUPLICATE_CODE");
    if (error.code === "42501") throw new StudyDataError("You are not authorized to create studies.", "FORBIDDEN");
    throw new StudyDataError("The study could not be created.", "DATABASE");
  }
  if (!data) throw new StudyDataError("The study was not returned after creation.", "DATABASE");
  return data;
}

export async function createStudyWithInitialRoute(
  input: CreateStudyWithRouteInput,
  suppliedClient?: SupabaseClient<Database>,
): Promise<Study> {
  const parsed = createStudyWithRouteSchema.safeParse(input);
  if (!parsed.success) throw new StudyDataError(parsed.error.issues[0]?.message || "Invalid study route.", "VALIDATION");

  const supabase = suppliedClient ?? await createClient();
  const locationJson = (location: typeof parsed.data.pickup) => ({
    label: location.label,
    formatted_address: location.formattedAddress,
    latitude: location.latitude,
    longitude: location.longitude,
    country_code: location.countryCode,
    region_name: location.regionName,
    currency_code: location.currencyCode,
    timezone: location.timezone,
    geocoding_provider: location.geocodingProvider,
    external_place_id: location.externalPlaceId,
    is_public_location: location.isPublicLocation,
  });
  const { data, error } = await supabase.rpc("create_study_with_initial_route_v2", {
    p_name: parsed.data.name,
    p_study_type: parsed.data.studyType,
    p_search_country_code: parsed.data.searchCountryCode,
    p_route_name: parsed.data.routeName,
    p_pickup: locationJson(parsed.data.pickup),
    p_destination: locationJson(parsed.data.destination),
    p_description: parsed.data.description,
    p_study_question: parsed.data.studyQuestion,
    p_isolated_variable: parsed.data.isolatedVariable,
    p_target_pair_count: parsed.data.targetPairCount,
    p_testing_starts_at: parsed.data.testingStartsAt,
    p_testing_ends_at: parsed.data.testingEndsAt,
    p_pickup_instructions: parsed.data.pickupInstructions,
    p_destination_instructions: parsed.data.destinationInstructions,
    p_route_notes: parsed.data.routeNotes,
    p_platform_service_ids: parsed.data.platformServiceIds,
  });
  if (error) {
    if (error.code === "23505") throw new StudyDataError("That study code or route name is already in use.", "DUPLICATE_CODE");
    if (error.code === "42501") throw new StudyDataError("You are not authorized to create studies.", "FORBIDDEN");
    throw new StudyDataError(error.message || "The study and route could not be created.", "DATABASE");
  }
  if (!data) throw new StudyDataError("The study was not returned after creation.", "DATABASE");
  return data;
}
