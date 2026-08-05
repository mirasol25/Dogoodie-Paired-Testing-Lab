"use client";

import { Download, Printer } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { protocolFixture } from "@/data/paired-testing-demo.fixtures";
import { downloadTextFile } from "@/lib/exports/csv-export";
import { formatDemoDate } from "@/lib/formatting/date-time";
import { DisclaimerAlert } from "@/components/paired-testing/shared/disclaimer-alert";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";

export function ProtocolClient() {
  const download = () => downloadTextFile(
    [
      protocolFixture.question,
      "",
      `Isolated variable: ${protocolFixture.isolatedVariable}`,
      "",
      "Fixed conditions:",
      ...protocolFixture.fixedConditions.map((item) => `- ${item}`),
      "",
      "Preliminary thresholds:",
      "- Timestamp: ≤5 seconds pass; >5–10 warning; >10 fail",
      "- GPS distance: ≤5 feet pass; >5–15 warning; >15 fail",
      "",
      demoConfig.disclaimer,
    ].join("\n"),
    demoConfig.reports.filenames.protocol,
    "text/plain;charset=utf-8",
  );
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${protocolFixture.id} · ${protocolFixture.version}`} title="Testing Protocol" description="Active demonstration protocol for same-platform, paired synthetic price collection." actions={<><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print Protocol</Button><Button onClick={download}><Download className="size-4" />Download Summary</Button></>} />
      <DisclaimerAlert />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="data-panel">
          <CardContent className="p-4 sm:p-5">
            <Accordion type="multiple" defaultValue={["question", "conditions", "variable", "evidence", "thresholds"]}>
              <Section value="question" label="A · Study question"><p className="max-w-3xl text-base leading-7 text-foreground">“{protocolFixture.question}”</p><p className="mt-3 text-xs text-muted-foreground">This is a preliminary research question, not a discrimination, causation, or legal-liability determination.</p></Section>
              <Section value="conditions" label="B · Fixed conditions"><BulletGrid items={protocolFixture.fixedConditions} /></Section>
              <Section value="variable" label="C · Isolated variable"><p className="text-sm font-semibold text-primary">{protocolFixture.isolatedVariable}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Profile label="Tester A" account="Standard account" membership="Non-member" /><Profile label="Tester B" account="Subscription account" membership="Subscription member" /></div></Section>
              <Section value="evidence" label="D · Required evidence"><BulletGrid items={protocolFixture.requiredEvidence} /></Section>
              <Section value="thresholds" label="E · Preliminary validation thresholds">
                <div className="mb-4 inline-flex rounded-md border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">Preliminary demonstration thresholds</div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Threshold title="Request synchronization" rows={[["≤ 5 seconds", "Pass"], ["> 5 and ≤ 10 seconds", "Warning"], ["> 10 seconds", "Fail"]]} />
                  <Threshold title="GPS proximity" rows={[["≤ 5 feet", "Pass"], ["> 5 and ≤ 15 feet", "Warning"], ["> 15 feet", "Fail"]]} />
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">Exact matching is required for platform, pickup, destination, ride tier, and currency. App version, operating-system family, and network category remain configurable assumptions.</p>
              </Section>
              <Section value="exclusions" label="F · Exclusion conditions"><BulletGrid items={protocolFixture.exclusions} /></Section>
            </Accordion>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="data-panel"><CardContent className="p-4"><p className="label-kicker">Protocol control</p><dl className="mt-4 space-y-3 text-xs"><Meta label="Protocol ID" value={protocolFixture.id} mono /><Meta label="Active version" value={protocolFixture.version} mono /><Meta label="Study" value={demoConfig.study.id} mono /><Meta label="Status" value="Active demonstration" /><Meta label="Timezone" value={demoConfig.study.timezone} mono /></dl></CardContent></Card>
          <Card className="data-panel"><CardContent className="p-4"><p className="label-kicker">Interpretation boundary</p><p className="mt-3 text-xs leading-5 text-muted-foreground">The validation engine evaluates technical conformity only. It does not determine discrimination, intent, causation, liability, statistical significance, scientific validity, or legal admissibility.</p><div className="mt-3"><StatusBadge status="Expert review required" /></div></CardContent></Card>
        </div>
      </div>
      <section>
        <div className="mb-3"><p className="label-kicker">Section G</p><h2 className="mt-1.5 text-lg font-semibold">Protocol version history</h2></div>
        <div className="data-panel overflow-x-auto rounded-lg"><Table><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Effective date</TableHead><TableHead>Modified by</TableHead><TableHead>Change summary</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{protocolFixture.versions.map((version) => <TableRow key={version.version}><TableCell className="mono font-semibold">{version.version}</TableCell><TableCell>{formatDemoDate(version.effectiveDate)}</TableCell><TableCell>{version.modifiedBy}</TableCell><TableCell className="max-w-md text-muted-foreground">{version.summary}</TableCell><TableCell><StatusBadge status={version.status} /></TableCell></TableRow>)}</TableBody></Table></div>
      </section>
    </div>
  );
}

function Section({ value, label, children }: { value: string; label: string; children: React.ReactNode }) {
  return <AccordionItem value={value}><AccordionTrigger className="text-sm font-semibold hover:no-underline">{label}</AccordionTrigger><AccordionContent className="pb-5 pt-2">{children}</AccordionContent></AccordionItem>;
}
function BulletGrid({ items }: { items: readonly string[] }) {
  return <ul className="grid gap-2 sm:grid-cols-2">{items.map((item) => <li key={item} className="flex gap-2 rounded-md border border-border/70 bg-secondary/25 p-2.5 text-xs text-muted-foreground"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}</ul>;
}
function Profile({ label, account, membership }: { label: string; account: string; membership: string }) {
  return <div className="rounded-md border border-border bg-secondary/25 p-3"><p className="mono text-[10px] text-primary">{label}</p><p className="mt-2 text-sm font-medium">{account}</p><p className="mt-1 text-xs text-muted-foreground">{membership}</p></div>;
}
function Threshold({ title, rows }: { title: string; rows: string[][] }) {
  return <div className="rounded-md border border-border bg-secondary/25 p-3"><p className="text-xs font-semibold">{title}</p><div className="mt-3 space-y-2">{rows.map(([threshold, status]) => <div key={threshold} className="flex items-center justify-between"><span className="mono text-xs text-muted-foreground">{threshold}</span><StatusBadge status={status} /></div>)}</div></div>;
}
function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className={mono ? "mono text-right text-foreground" : "text-right text-foreground"}>{value}</dd></div>;
}

