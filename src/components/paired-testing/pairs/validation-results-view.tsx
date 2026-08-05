import { ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MatchedPairValidationResult } from "@/lib/data/matched-pairs";

const categoryOrder = ["Assignment conformity", "Timing", "Location", "Required evidence", "Advisory checks"];
const obsoleteRules = new Set(["evidence_gps_coordinates", "evidence_evidence_metadata"]);
const labels: Record<string, string> = {
  location_gap: "Distance between testers",
  tester_a_pickup_proximity: "Tester A distance from pickup",
  tester_b_pickup_proximity: "Tester B distance from pickup",
};

export function normalizedValidationResults(results: MatchedPairValidationResult[]): MatchedPairValidationResult[] {
  return results.filter((result) => !obsoleteRules.has(result.rule_code)).map((result) => {
    const a = scalarText(result.tester_a_value);
    const b = scalarText(result.tester_b_value);
    if (result.requirement_level !== "advisory") return { ...result, label: labels[result.rule_code] ?? result.label };
    const bothMissing = !a && !b;
    const matches = a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
    return {
      ...result,
      label: labels[result.rule_code] ?? result.label,
      status: bothMissing ? "not_applicable" : matches ? "pass" : "warning",
      observed_difference: bothMissing ? "Optional value not provided" : matches ? "Match" : "Advisory difference",
      affects_overall_status: !bothMissing && !matches,
    };
  });
}

function scalarText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim().toLowerCase();
  return "";
}

function category(result: MatchedPairValidationResult) {
  if (["assigned_provider_tier", "currency", "pickup_location", "destination_location"].includes(result.rule_code)) return "Assignment conformity";
  if (result.rule_code === "request_time_gap") return "Timing";
  if (result.rule_code.includes("location") || result.rule_code.includes("proximity")) return "Location";
  if (result.rule_code.startsWith("evidence_")) return result.requirement_level === "required" ? "Required evidence" : "Advisory checks";
  return "Advisory checks";
}

function formattedValue(value: unknown, timezone: string): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) {
      return `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium", timeZone: timezone }).format(new Date(value))} (${timezone})`;
    }
    return value;
  }
  if (typeof value === "number") return value === 1 ? "Present" : value === 0 ? "Missing" : String(value);
  if (typeof value === "boolean") return value ? "Present" : "Missing";
  if (typeof value === "object" && !Array.isArray(value)) {
    const item = value as Record<string, unknown>;
    if (typeof item.latitude === "number" && typeof item.longitude === "number") return `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`;
    return Object.entries(item).map(([key, entry]) => `${key.replaceAll("_", " ")}: ${formattedValue(entry, timezone)}`).join(" | ");
  }
  return Array.isArray(value) ? value.map((item) => formattedValue(item, timezone)).join(", ") : String(value);
}

function thresholds(value: unknown, ruleCode: string) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Object.keys(value).length) return null;
  const item = value as Record<string, unknown>;
  if (ruleCode === "request_time_gap") return `Pass: 0-${item.preferred_max_seconds}s | Warning: ${item.preferred_max_seconds}-${item.maximum_seconds}s | Fail: over ${item.maximum_seconds}s`;
  const preferred = Number(item.preferred_max_feet);
  const maximum = Number(item.maximum_feet);
  if (Number.isFinite(preferred) && Number.isFinite(maximum)) return `Pass: 0-${preferred} ft | Warning: ${preferred}-${maximum} ft | Fail: over ${maximum} ft`;
  return Object.entries(item).map(([key, entry]) => `${key.replaceAll("_", " ")}: ${String(entry)}`).join(" | ");
}

function finding(result: MatchedPairValidationResult) {
  const raw = result.observed_difference || "Comparison complete";
  const number = Number.parseFloat(raw);
  if (!Number.isFinite(number)) return raw;
  if (raw.includes("second")) {
    const maximum = Number((result.threshold_configuration as Record<string, unknown> | null)?.maximum_seconds);
    return `${Math.round(number)} sec${Number.isFinite(maximum) && number > maximum ? ` | ${Math.round(number - maximum)} sec over maximum` : ""}`;
  }
  if (raw.includes("feet") || raw.includes("foot")) {
    const meters = number * 0.3048;
    const metric = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
    const maximum = Number((result.threshold_configuration as Record<string, unknown> | null)?.maximum_feet);
    return `${Math.round(number).toLocaleString("en")} ft (${metric})${Number.isFinite(maximum) && number > maximum ? ` | exceeds ${maximum}-ft maximum` : ""}`;
  }
  return raw;
}

export function ValidationResultsView({ results, timezone }: { results: MatchedPairValidationResult[]; timezone: string }) {
  const normalized = normalizedValidationResults(results);
  const attention = normalized.filter((result) => result.status !== "pass" && result.status !== "not_applicable");
  const passed = normalized.filter((result) => result.status === "pass" || result.status === "not_applicable");
  const requiredFailures = normalized.filter((result) => result.status === "fail" && result.requirement_level === "required").length;
  const warnings = normalized.filter((result) => result.status === "warning").length;
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-border bg-card/25 px-4 py-3 text-xs"><span><strong className="text-foreground">{requiredFailures}</strong> required failures</span><span><strong className="text-foreground">{warnings}</strong> warnings</span><span className="text-muted-foreground">{normalized.length} applicable checks</span></div>
    {attention.length ? <ResultGroups results={attention} timezone={timezone} /> : <div className="rounded-md border border-primary/20 bg-primary/[0.035] px-4 py-5"><p className="text-sm font-semibold text-primary">No technical findings need attention</p><p className="mt-1 text-xs text-muted-foreground">All required checks passed and no advisory differences were found.</p></div>}
    {passed.length ? <details className="group overflow-hidden rounded-md border border-border"><summary className="flex cursor-pointer list-none items-center justify-between bg-card/35 px-4 py-3 text-sm font-medium"><span>Passed and not-applicable checks ({passed.length})</span><ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary><div className="border-t border-border"><ResultGroups results={passed} timezone={timezone} compact /></div></details> : null}
  </div>;
}

function ResultGroups({ results, timezone, compact = false }: { results: MatchedPairValidationResult[]; timezone: string; compact?: boolean }) {
  return <div className="space-y-4">{categoryOrder.map((name) => {
    const grouped = results.filter((result) => category(result) === name);
    if (!grouped.length) return null;
    return <section key={name}><div className={compact ? "px-4 pt-4" : "mb-2"}><p className="text-[10px] font-semibold uppercase text-muted-foreground">{name}</p></div><div className={compact ? "overflow-x-auto" : "overflow-hidden rounded-md border border-border"}><Table className="min-w-[900px] table-fixed"><TableHeader><TableRow><TableHead className="w-[32%]">Rule</TableHead><TableHead className="w-[17%]">Tester A value</TableHead><TableHead className="w-[17%]">Compared value</TableHead><TableHead className="w-[24%]">Finding</TableHead><TableHead className="w-[10%]">Result</TableHead></TableRow></TableHeader><TableBody>{grouped.map((result) => <TableRow key={result.id} className={`[&_td]:h-24 [&_td]:align-top [&_td]:py-4 ${result.status === "fail" ? "bg-red-400/[0.025]" : result.status === "warning" ? "bg-amber-400/[0.025]" : ""}`}><TableCell className="break-words"><p className="font-medium">{result.label}</p><p className="mt-1 text-[10px] capitalize text-muted-foreground">{result.requirement_level} | {result.rule_code.includes("gap") || result.rule_code.includes("proximity") ? "Threshold comparison" : "Exact comparison"}</p><p className="mt-2 max-w-md text-[11px] leading-4 text-muted-foreground">{result.explanation}</p>{thresholds(result.threshold_configuration, result.rule_code) ? <p className="mt-1 text-[10px] text-primary/75">{thresholds(result.threshold_configuration, result.rule_code)}</p> : null}</TableCell><TableCell className="break-words text-xs text-muted-foreground">{formattedValue(result.tester_a_value, timezone)}</TableCell><TableCell className="break-words text-xs text-muted-foreground">{formattedValue(result.tester_b_value, timezone)}</TableCell><TableCell className="break-words text-xs font-medium">{finding(result)}</TableCell><TableCell><StatusBadge status={result.status} /></TableCell></TableRow>)}</TableBody></Table></div></section>;
  })}</div>;
}
