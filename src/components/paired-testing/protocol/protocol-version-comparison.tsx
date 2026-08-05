import { ArrowRight, Check, GitCompareArrows, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Protocol } from "@/lib/data/protocols";
import type { Json } from "@/types/database.types";

type ChangeKind = "added" | "removed" | "changed";

interface Change {
  section: string;
  field: string;
  kind: ChangeKind;
  before?: string;
  after?: string;
}

interface RuleValue {
  label: string;
  value: string;
}

function display(value: string | null | undefined): string {
  return value?.trim() || "Not set";
}

function objectValue(value: Json, key: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value[key] ?? null;
}

function ruleMap(value: Json): Map<string, RuleValue> {
  const result = new Map<string, RuleValue>();
  if (!Array.isArray(value)) return result;
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const code = typeof entry.code === "string" ? entry.code : null;
    const label = typeof entry.label === "string" ? entry.label : code;
    if (!code || !label) continue;
    const details = Object.entries(entry)
      .filter(([key]) => !["code", "label"].includes(key))
      .sort(([left], [right]) => left.localeCompare(right));
    result.set(code, { label, value: JSON.stringify(details) });
  }
  return result;
}

function compareRules(section: string, before: Json, after: Json): Change[] {
  const previous = ruleMap(before);
  const next = ruleMap(after);
  const codes = new Set([...previous.keys(), ...next.keys()]);
  return [...codes].sort().flatMap<Change>((code): Change[] => {
    const oldRule = previous.get(code);
    const newRule = next.get(code);
    if (!oldRule && newRule) return [{ section, field: newRule.label, kind: "added" as const }];
    if (oldRule && !newRule) return [{ section, field: oldRule.label, kind: "removed" as const }];
    if (oldRule && newRule && oldRule.value !== newRule.value) return [{ section, field: newRule.label, kind: "changed" as const, before: "Previous settings", after: "Updated settings" }];
    return [];
  });
}

function compareField(section: string, field: string, before: string | null, after: string | null): Change[] {
  if (display(before) === display(after)) return [];
  return [{ section, field, kind: "changed", before: display(before), after: display(after) }];
}

function flattenNumbers(value: Json, prefix = ""): Map<string, number> {
  const result = new Map<string, number>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof nested === "number") result.set(path, nested);
    else if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      for (const [nestedPath, number] of flattenNumbers(nested, path)) result.set(nestedPath, number);
    }
  }
  return result;
}

function thresholdLabel(path: string): string {
  const labels: Record<string, string> = {
    "request_time_gap.preferred_max_seconds": "Preferred request-time gap",
    "request_time_gap.maximum_seconds": "Maximum request-time gap",
    "location_gap.preferred_max_feet": "Preferred location-distance gap",
    "location_gap.maximum_feet": "Maximum location-distance gap",
  };
  return labels[path] || path.replaceAll("_", " ");
}

function compareThresholds(before: Json, after: Json): Change[] {
  const previous = flattenNumbers(before);
  const next = flattenNumbers(after);
  const paths = new Set([...previous.keys(), ...next.keys()]);
  return [...paths].sort().flatMap((path) => {
    const oldValue = previous.get(path);
    const newValue = next.get(path);
    if (oldValue === newValue) return [];
    const unit = path.includes("seconds") ? " sec" : path.includes("feet") ? " ft" : "";
    return [{ section: "Validation thresholds", field: thresholdLabel(path), kind: "changed" as const, before: oldValue === undefined ? "Not set" : `${oldValue}${unit}`, after: newValue === undefined ? "Not set" : `${newValue}${unit}` }];
  });
}

function changesBetween(active: Protocol, draft: Protocol): Change[] {
  return [
    ...compareField("Protocol details", "Title", active.title, draft.title),
    ...compareField("Protocol details", "Description", active.description, draft.description),
    ...compareField("Isolated variable", "Tester A value", active.tester_a_value, draft.tester_a_value),
    ...compareField("Isolated variable", "Tester B value", active.tester_b_value, draft.tester_b_value),
    ...compareRules("Fixed conditions", active.fixed_controls, draft.fixed_controls),
    ...compareRules("Required evidence", active.evidence_requirements, draft.evidence_requirements),
    ...compareRules("Observation data", objectValue(active.validation_configuration, "observation_fields"), objectValue(draft.validation_configuration, "observation_fields")),
    ...compareThresholds(active.validation_configuration, draft.validation_configuration),
    ...compareRules("Exclusion conditions", active.exclusion_conditions, draft.exclusion_conditions),
  ];
}

function ChangeIcon({ kind }: { kind: ChangeKind }) {
  if (kind === "added") return <Plus className="size-3.5 text-emerald-500" />;
  if (kind === "removed") return <Minus className="size-3.5 text-destructive" />;
  return <ArrowRight className="size-3.5 text-amber-500" />;
}

export function ProtocolVersionComparison({ active, draft }: { active: Protocol; draft: Protocol }) {
  const changes = changesBetween(active, draft);
  const sections = [...new Set(changes.map((change) => change.section))];

  return (
    <section className="space-y-5 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Version comparison</p><h2 className="mt-1.5 flex items-center gap-2 text-lg font-semibold"><GitCompareArrows className="size-4 text-primary" />{active.version} to {draft.version}</h2><p className="mt-2 text-xs text-muted-foreground">Changes in the draft compared with the protocol that remains active.</p></div><Badge variant={changes.length ? "outline" : "secondary"}>{changes.length} {changes.length === 1 ? "change" : "changes"}</Badge></div>
      {draft.change_summary ? <div className="border-l-2 border-primary pl-3"><p className="text-[10px] text-muted-foreground">Change summary</p><p className="mt-1 text-sm">{draft.change_summary}</p></div> : null}
      {!changes.length ? <div className="flex items-center gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground"><Check className="size-4 text-primary" />The draft currently matches {active.version}.</div> : <div className="divide-y divide-border rounded-md border border-border">{sections.map((section) => <div key={section} className="grid gap-3 p-4 md:grid-cols-[180px_minmax(0,1fr)]"><h3 className="text-xs font-semibold">{section}</h3><div className="space-y-2">{changes.filter((change) => change.section === section).map((change) => <div key={`${change.kind}-${change.field}`} className="flex items-start gap-2 text-xs"><ChangeIcon kind={change.kind} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{change.field}</span><Badge variant="outline" className="text-[10px] capitalize">{change.kind}</Badge></div>{change.kind === "changed" ? <p className="mt-1 break-words text-muted-foreground"><span className="line-through">{change.before}</span><ArrowRight className="mx-1 inline size-3" />{change.after}</p> : null}</div></div>)}</div></div>)}</div>}
    </section>
  );
}
