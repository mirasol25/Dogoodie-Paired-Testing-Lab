import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

export type ActivityLogEvent = Database["public"]["Functions"]["list_activity_log_feed"]["Returns"][number];

export interface ActivityLogFilters { search?: string; category?: string; actorId?: string; targetType?: string; action?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }
export interface ActivityLogFilterOptions { actors: Array<{ id: string; label: string }>; actions: string[]; targetTypes: string[] }

export async function listActivityLogFeed(studyId: string, filters: ActivityLogFilters) {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_activity_log_feed", { p_study_id: studyId, p_search: filters.search || null, p_category: filters.category || null, p_actor_id: filters.actorId || null, p_target_type: filters.targetType || null, p_action: filters.action || null, p_date_from: filters.dateFrom || null, p_date_to: filters.dateTo || null, p_limit: pageSize, p_offset: (page - 1) * pageSize });
  if (error) throw new Error(error.message || "Activity could not be loaded.");
  return { events: data, total: Number(data[0]?.total_count ?? 0), page, pageSize };
}

export async function listActivityLogFilterOptions(studyId: string): Promise<ActivityLogFilterOptions> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_activity_log_filter_options", { p_study_id: studyId });
  if (error) throw new Error(error.message || "Activity filters could not be loaded.");
  if (!data || typeof data !== "object" || Array.isArray(data)) return { actors: [], actions: [], targetTypes: [] };
  const actors = Array.isArray(data.actors) ? data.actors.flatMap((actor) => actor && typeof actor === "object" && !Array.isArray(actor) && typeof actor.id === "string" && typeof actor.label === "string" ? [{ id: actor.id, label: actor.label }] : []) : [];
  const actions = Array.isArray(data.actions) ? data.actions.filter((value): value is string => typeof value === "string") : [];
  const targetTypes = Array.isArray(data.target_types) ? data.target_types.filter((value): value is string => typeof value === "string") : [];
  return { actors, actions, targetTypes };
}

export async function listActivityLogCategories(studyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_activity_log_categories", { p_study_id: studyId });
  if (error) throw new Error(error.message || "Activity categories could not be loaded.");
  return data.map((entry) => entry.category);
}

export function formatActivityDetails(details: Json): Array<[string, string]> {
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];
  return Object.entries(details).map(([key, value]) => [key.replaceAll("_", " "), typeof value === "string" ? value : JSON.stringify(value)]);
}
