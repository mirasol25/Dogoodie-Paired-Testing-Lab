import Link from "next/link";
import { AlertTriangle, Check, Clock3, Download, FileCheck2, GitCompareArrows, MapPin, Printer, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Protocol } from "@/lib/data/protocols";
import type { Json } from "@/types/database.types";

interface ConfigEntry {
  code: string;
  label: string;
  required: boolean;
  source?: string;
  comparison?: string;
  severity?: string;
}

function entries(value: Json): ConfigEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const code = "code" in entry && typeof entry.code === "string" ? entry.code : null;
    const label = "label" in entry && typeof entry.label === "string" ? entry.label : null;
    if (!code || !label) return [];
    return [{
      code,
      label,
      required: "required" in entry && entry.required === true,
      source: "source" in entry && typeof entry.source === "string" ? entry.source : undefined,
      comparison: "comparison" in entry && typeof entry.comparison === "string" ? entry.comparison : undefined,
      severity: "severity" in entry && typeof entry.severity === "string" ? entry.severity : undefined,
    }];
  });
}

function objectAt(value: Json, key: string): Record<string, Json | undefined> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const nested = value[key];
  return nested && typeof nested === "object" && !Array.isArray(nested) ? nested : null;
}

function valueAt(value: Json, key: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value[key] ?? null;
}

function numberAt(value: Record<string, Json | undefined> | null, key: string): number | null {
  const result = value?.[key];
  return typeof result === "number" ? result : null;
}

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";
}

function EntryList({ items, suffix }: { items: ConfigEntry[]; suffix?: (entry: ConfigEntry) => string }) {
  if (!items.length) return <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No items configured.</p>;
  return <div className="grid gap-2 sm:grid-cols-2">{items.map((entry) => <div key={entry.code} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-2"><Check className="size-3.5 shrink-0 text-primary" /><span className="min-w-0 flex-1 text-xs font-medium">{entry.label}</span>{suffix ? <span className="text-[10px] capitalize text-muted-foreground">{suffix(entry)}</span> : null}<Badge variant={entry.required ? "outline" : "secondary"} className="text-[10px]">{entry.required ? "Required" : "Optional"}</Badge></div>)}</div>;
}

function ThresholdBand({ preferred, maximum, unit }: { preferred: number | null; maximum: number | null; unit: string }) {
  return <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border text-center text-xs"><div className="p-3"><span className="font-medium text-emerald-500">Pass</span><span className="mt-1 block text-muted-foreground">0-{preferred ?? "?"} {unit}</span></div><div className="p-3"><span className="font-medium text-amber-500">Warning</span><span className="mt-1 block text-muted-foreground">&gt;{preferred ?? "?"}-{maximum ?? "?"} {unit}</span></div><div className="p-3"><span className="font-medium text-destructive">Fail</span><span className="mt-1 block text-muted-foreground">&gt;{maximum ?? "?"} {unit}</span></div></div>;
}

function MetadataRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="border-b border-border py-3 last:border-0"><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className={`mt-1 break-words text-xs font-medium ${mono ? "mono" : ""}`}>{value}</dd></div>;
}

export function ActiveProtocolView({ protocol, studyCode, showExportActions = true }: { protocol: Protocol; studyCode: string; showExportActions?: boolean }) {
  const controls = entries(protocol.fixed_controls);
  const evidence = entries(protocol.evidence_requirements);
  const exclusions = entries(protocol.exclusion_conditions);
  const observations = entries(valueAt(protocol.validation_configuration, "observation_fields"));
  const time = objectAt(protocol.validation_configuration, "request_time_gap");
  const location = objectAt(protocol.validation_configuration, "location_gap");

  return (
    <section className="protocol-print-document space-y-5 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">{protocol.status === "draft" ? "Pre-activation preview" : "Controlled testing document"}</p><h2 className="mt-1.5 text-xl font-semibold">{protocol.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{protocol.study_question || "Versioned conditions, evidence requirements, and validation rules for this paired test."}</p>{protocol.status === "draft" ? <p className="mt-2 text-xs text-amber-500">Review this complete document before activation. Activation locks this version from further editing.</p> : null}</div><div className="flex flex-wrap items-center gap-2"><Badge variant={protocol.status === "active" ? "default" : "outline"} className="capitalize">{protocol.status}</Badge>{showExportActions ? <div className="no-print flex items-center gap-2"><Button asChild variant="outline" size="sm"><Link href={`/paired-testing-demo/protocol/print?version=${encodeURIComponent(protocol.version)}&mode=print`} target="_blank"><Printer className="size-3.5" />Print</Link></Button><Button asChild size="sm"><Link href={`/paired-testing-demo/protocol/print?version=${encodeURIComponent(protocol.version)}&mode=pdf`} target="_blank"><Download className="size-3.5" />Save PDF</Link></Button></div> : null}</div></div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <Accordion type="multiple" defaultValue={["question", "conditions", "variable", "evidence", "thresholds", "exclusions"]} className="rounded-md border border-border px-4">
          <AccordionItem id="protocol-section-question" value="question"><AccordionTrigger className="py-4 hover:no-underline"><span className="flex items-center gap-2 text-left"><FileCheck2 className="size-4 text-primary" />A. Study question</span></AccordionTrigger><AccordionContent className="pb-5"><p className="text-sm font-medium leading-6">{protocol.study_question}</p><p className="mt-2 text-xs text-muted-foreground">The protocol controls matching conditions so the intended variable can be examined consistently.</p></AccordionContent></AccordionItem>

          <AccordionItem id="protocol-section-conditions" value="conditions"><AccordionTrigger className="py-4 hover:no-underline"><span className="flex items-center gap-2 text-left"><ShieldCheck className="size-4 text-primary" />B. Fixed conditions <Badge variant="secondary">{controls.length}</Badge></span></AccordionTrigger><AccordionContent className="pb-5"><EntryList items={controls} suffix={(entry) => entry.comparison || "exact"} /></AccordionContent></AccordionItem>

          <AccordionItem id="protocol-section-variable" value="variable"><AccordionTrigger className="py-4 hover:no-underline"><span className="flex items-center gap-2 text-left"><GitCompareArrows className="size-4 text-primary" />C. Isolated variable</span></AccordionTrigger><AccordionContent className="pb-5"><p className="text-xs font-semibold text-primary">{protocol.isolated_variable || "Not configured"}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-md border border-border p-4"><p className="text-[10px] text-muted-foreground">Tester A</p><p className="mt-2 text-sm font-semibold">{protocol.tester_a_value || "Not captured"}</p></div><div className="rounded-md border border-border p-4"><p className="text-[10px] text-muted-foreground">Tester B</p><p className="mt-2 text-sm font-semibold">{protocol.tester_b_value || "Not captured"}</p></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">This is the intended difference between the paired testers. Fixed conditions must otherwise remain matched.</p></AccordionContent></AccordionItem>

          <AccordionItem id="protocol-section-evidence" value="evidence"><AccordionTrigger className="py-4 hover:no-underline"><span className="flex items-center gap-2 text-left"><Check className="size-4 text-primary" />D. Required evidence <Badge variant="secondary">{evidence.length + observations.length}</Badge></span></AccordionTrigger><AccordionContent className="space-y-5 pb-5"><div className="space-y-2"><h3 className="text-xs font-semibold">Evidence artifacts</h3><EntryList items={evidence} /></div><div className="space-y-2"><h3 className="text-xs font-semibold">Recorded observation data</h3><EntryList items={observations} suffix={(entry) => entry.source || "tester"} /></div></AccordionContent></AccordionItem>

          <AccordionItem id="protocol-section-thresholds" value="thresholds"><AccordionTrigger className="py-4 hover:no-underline"><span className="flex items-center gap-2 text-left"><Clock3 className="size-4 text-primary" />E. Preliminary validation thresholds</span></AccordionTrigger><AccordionContent className="pb-5"><Badge variant="outline" className="mb-4 text-amber-500">Preliminary methodology</Badge><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-2"><h3 className="text-xs font-semibold">Request-time gap</h3><ThresholdBand preferred={numberAt(time, "preferred_max_seconds")} maximum={numberAt(time, "maximum_seconds")} unit="sec" /></div><div className="space-y-2"><h3 className="flex items-center gap-1.5 text-xs font-semibold"><MapPin className="size-3.5" />Location-distance gap</h3><ThresholdBand preferred={numberAt(location, "preferred_max_feet")} maximum={numberAt(location, "maximum_feet")} unit="ft" /></div></div><p className="mt-4 text-xs leading-5 text-muted-foreground">These thresholds evaluate technical conformity and remain subject to confirmation by qualified methodology experts.</p></AccordionContent></AccordionItem>

          <AccordionItem id="protocol-section-exclusions" value="exclusions"><AccordionTrigger className="py-4 hover:no-underline"><span className="flex items-center gap-2 text-left"><AlertTriangle className="size-4 text-destructive" />F. Exclusion conditions <Badge variant="secondary">{exclusions.length}</Badge></span></AccordionTrigger><AccordionContent className="pb-5"><EntryList items={exclusions} suffix={(entry) => entry.severity || "fail"} /></AccordionContent></AccordionItem>
        </Accordion>

        <div role="complementary" className="rounded-md border border-border bg-secondary/20 p-4 xl:sticky xl:top-20"><p className="label-kicker">Protocol metadata</p><dl className="mt-2"><MetadataRow label="Protocol code" value={protocol.protocol_code} mono /><MetadataRow label="Version" value={protocol.version} mono /><MetadataRow label="Study" value={studyCode} mono /><MetadataRow label="Status" value={protocol.status} /><MetadataRow label="Created" value={formatDate(protocol.created_at)} /><MetadataRow label="Updated" value={formatDate(protocol.updated_at)} /><MetadataRow label="Effective" value={formatDate(protocol.effective_at)} />{protocol.change_summary ? <MetadataRow label="Change summary" value={protocol.change_summary} /> : null}</dl></div>
      </div>

      <p className="border-l-2 border-amber-500 pl-3 text-xs leading-5 text-muted-foreground">Technical validation evaluates protocol conformity only. It does not determine discrimination, causation, intent, liability, statistical significance, or legal admissibility.</p>
    </section>
  );
}
