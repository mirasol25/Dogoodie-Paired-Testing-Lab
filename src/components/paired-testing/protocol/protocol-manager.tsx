import Link from "next/link";
import { ArrowLeft, CircleDot, Eye, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { CreateProtocolDetails } from "@/components/paired-testing/protocol/create-protocol-details";
import { MatchingControlsForm } from "@/components/paired-testing/protocol/matching-controls-form";
import { ValidationThresholdsForm } from "@/components/paired-testing/protocol/validation-thresholds-form";
import { RequirementsForm } from "@/components/paired-testing/protocol/requirements-form";
import { ExclusionConditionsForm } from "@/components/paired-testing/protocol/exclusion-conditions-form";
import { ProtocolActivation } from "@/components/paired-testing/protocol/protocol-activation";
import { ActiveProtocolView } from "@/components/paired-testing/protocol/active-protocol-view";
import { EditProtocolDetails } from "@/components/paired-testing/protocol/edit-protocol-details";
import { CreateProtocolVersion } from "@/components/paired-testing/protocol/create-protocol-version";
import { ProtocolVersionComparison } from "@/components/paired-testing/protocol/protocol-version-comparison";
import { DiscardProtocolDraft } from "@/components/paired-testing/protocol/discard-protocol-draft";
import { ProtocolDraftWorkspace } from "@/components/paired-testing/protocol/protocol-draft-workspace";
import { ProtocolReadWorkspace } from "@/components/paired-testing/protocol/protocol-read-workspace";
import { protocolAccessLabel } from "@/lib/auth/protocol-permissions";
import { configuredStudyServiceSides, StudyServiceContext } from "@/components/paired-testing/shared/study-service-context";
import type { Protocol } from "@/lib/data/protocols";
import type { ProviderServiceOption, Study } from "@/lib/data/studies";
import type { AppRole } from "@/lib/data/profiles";

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "Not active";
}

function ProtocolHistory({ protocols, selectedId }: { protocols: Protocol[]; selectedId?: string }) {
  return (
    <section className="space-y-3">
      <div><p className="label-kicker">Version control</p><h2 className="mt-1.5 text-lg font-semibold">Protocol history</h2><p className="mt-1 text-xs text-muted-foreground">Open any version without changing the active protocol.</p></div>
      <div className="overflow-hidden rounded-md border border-border"><Table><TableHeader className="bg-secondary/45"><TableRow><TableHead>Version</TableHead><TableHead>Protocol</TableHead><TableHead>Status</TableHead><TableHead>Effective</TableHead><TableHead>Updated</TableHead><TableHead className="w-20 text-right">View</TableHead></TableRow></TableHeader><TableBody>{protocols.map((protocol) => <TableRow key={protocol.id} data-state={selectedId === protocol.id ? "selected" : undefined}><TableCell className="mono font-medium">{protocol.version}</TableCell><TableCell className="min-w-64 whitespace-normal"><p className="text-sm font-medium">{protocol.title}</p><p className="mono mt-1 text-[10px] text-muted-foreground">{protocol.protocol_code}</p>{protocol.change_summary ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Changes:</span> {protocol.change_summary}</p> : <p className="mt-1.5 text-xs text-muted-foreground">Initial protocol version</p>}</TableCell><TableCell><Badge variant={protocol.status === "active" ? "default" : "outline"} className="capitalize">{protocol.status === "active" ? <CircleDot className="size-3" /> : null}{protocol.status}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(protocol.effective_at)}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(protocol.updated_at)}</TableCell><TableCell className="text-right"><Button asChild variant="ghost" size="icon-sm"><Link href={`/paired-testing-demo/protocol?version=${encodeURIComponent(protocol.version)}`} aria-label={`View ${protocol.version}`} title={`View ${protocol.version}`}><Eye className="size-3.5" /></Link></Button></TableCell></TableRow>)}{!protocols.length ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No protocol versions available.</TableCell></TableRow> : null}</TableBody></Table></div>
    </section>
  );
}

export function ProtocolManager({ study, protocols, serviceOptions, canManage, accessRole, selectedVersion, initialConfigureStep = "details" }: { study: Study; protocols: Protocol[]; serviceOptions: ProviderServiceOption[]; canManage: boolean; accessRole: AppRole; selectedVersion?: string; initialConfigureStep?: "details" | "conditions" }) {
  const canEdit = canManage && !["completed", "archived"].includes(study.status);
  const activeProtocol = protocols.find((protocol) => protocol.status === "active") ?? null;
  const draftProtocol = protocols.find((protocol) => protocol.status === "draft") ?? null;
  const workingProtocol = canEdit ? draftProtocol ?? activeProtocol ?? protocols[0] ?? null : activeProtocol ?? draftProtocol ?? protocols[0] ?? null;
  const selectedProtocol = selectedVersion ? protocols.find((protocol) => protocol.version === selectedVersion) ?? null : null;
  const currentProtocol = selectedProtocol ?? workingProtocol;
  const viewingSelectedVersion = Boolean(selectedVersion && selectedProtocol);
  const showCreateVersion = currentProtocol?.status === "active" && !draftProtocol && canEdit;
  const serviceSides = configuredStudyServiceSides(study, serviceOptions);
  const sideServicesDiffer = Boolean(serviceSides.testerA && serviceSides.testerB && serviceSides.testerA.id !== serviceSides.testerB.id);
  const history = <ProtocolHistory protocols={protocols} selectedId={currentProtocol?.id} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${study.study_code} - ${study.status}`} title="Testing Protocol" description={study.name} actions={showCreateVersion ? <CreateProtocolVersion studyId={study.id} protocolId={currentProtocol.id} version={currentProtocol.version} /> : undefined} />
      <StudyServiceContext study={study} services={serviceOptions} />

      <div className="grid divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="py-4 sm:px-4 sm:first:pl-0"><p className="text-[10px] text-muted-foreground">Active version</p><p className="mono mt-1 text-sm font-semibold">{activeProtocol?.version ?? "None"}</p></div>
        <div className="py-4 sm:px-4"><p className="text-[10px] text-muted-foreground">Working version</p><p className="mono mt-1 text-sm font-semibold">{draftProtocol?.version ?? activeProtocol?.version ?? "Not created"}</p></div>
        <div className="py-4 sm:px-4"><p className="text-[10px] text-muted-foreground">Versions</p><p className="mt-1 text-sm font-semibold">{protocols.length}</p></div>
        <div className="py-4 sm:px-4"><p className="text-[10px] text-muted-foreground">Access</p><p className="mt-1 text-sm font-semibold">{canEdit ? "Manage" : "Read only"}</p></div>
      </div>

      {!canManage ? <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/25 px-4 py-3"><Eye className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-medium">Read-only protocol access</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{protocolAccessLabel(accessRole)} can inspect, print, and export authorized protocol versions but cannot create, edit, discard, or activate them.</p></div></div> : null}
      {canManage && !canEdit ? <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/25 px-4 py-3"><FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-medium">Protocol locked by study lifecycle</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Completed and archived studies preserve their protocol versions as read-only records.</p></div></div> : null}

      {viewingSelectedVersion ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/25 px-4 py-3"><p className="text-sm"><span className="font-medium">Viewing {currentProtocol?.version}.</span> {currentProtocol?.status === "superseded" ? " This historical version is read-only." : currentProtocol?.status === "active" ? " This is the currently active version." : " This is the current editable draft."}</p><Button asChild variant="outline" size="sm"><Link href="/paired-testing-demo/protocol"><ArrowLeft className="size-3.5" />Return to current protocol</Link></Button></div> : draftProtocol && activeProtocol ? <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3"><p className="text-sm"><span className="font-medium">Editing {draftProtocol.version} draft.</span> {activeProtocol.version} remains active until this draft is activated.</p></div> : null}

      {!currentProtocol && canEdit ? <CreateProtocolDetails study={{ id: study.id, name: study.name, studyCode: study.study_code, studyQuestion: study.study_question, isolatedVariable: study.isolated_variable, testerAValue: sideServicesDiffer ? `${serviceSides.testerA?.platformName} · ${serviceSides.testerA?.serviceName}` : "", testerBValue: sideServicesDiffer ? `${serviceSides.testerB?.platformName} · ${serviceSides.testerB?.serviceName}` : "" }} /> : null}
      {!currentProtocol && !canEdit ? <section className="border-y border-border py-12 text-center"><FileCheck2 className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 text-base font-semibold">No testing protocol yet</h2><p className="mt-2 text-sm text-muted-foreground">This study does not have a protocol available for review.</p></section> : null}

      {currentProtocol?.status === "draft" && canEdit && !viewingSelectedVersion ? <ProtocolDraftWorkspace
        version={currentProtocol.version}
        initialConfigureStep={initialConfigureStep}
        discard={<DiscardProtocolDraft studyId={study.id} protocolId={currentProtocol.id} version={currentProtocol.version} hasActiveVersion={Boolean(activeProtocol)} />}
        details={<EditProtocolDetails protocol={currentProtocol} />}
        conditions={<MatchingControlsForm studyId={study.id} protocolId={currentProtocol.id} fixedControls={currentProtocol.fixed_controls} />}
        thresholds={<ValidationThresholdsForm studyId={study.id} protocolId={currentProtocol.id} configuration={currentProtocol.validation_configuration} />}
        requirements={<RequirementsForm studyId={study.id} protocolId={currentProtocol.id} evidenceRequirements={currentProtocol.evidence_requirements} validationConfiguration={currentProtocol.validation_configuration} fixedControls={currentProtocol.fixed_controls} />}
        exclusions={<ExclusionConditionsForm studyId={study.id} protocolId={currentProtocol.id} fixedControls={currentProtocol.fixed_controls} evidenceRequirements={currentProtocol.evidence_requirements} validationConfiguration={currentProtocol.validation_configuration} exclusionConditions={currentProtocol.exclusion_conditions} hasComparison={Boolean(activeProtocol)} />}
        comparison={activeProtocol ? <ProtocolVersionComparison active={activeProtocol} draft={currentProtocol} /> : undefined}
        preview={<ActiveProtocolView protocol={currentProtocol} studyCode={study.study_code} />}
        activation={<ProtocolActivation studyId={study.id} protocol={{ id: currentProtocol.id, title: currentProtocol.title, protocolCode: currentProtocol.protocol_code, version: currentProtocol.version, studyQuestion: currentProtocol.study_question, isolatedVariable: currentProtocol.isolated_variable, testerAValue: currentProtocol.tester_a_value, testerBValue: currentProtocol.tester_b_value, fixedControls: currentProtocol.fixed_controls, evidenceRequirements: currentProtocol.evidence_requirements, validationConfiguration: currentProtocol.validation_configuration, exclusionConditions: currentProtocol.exclusion_conditions }} />}
      /> : null}

      {currentProtocol?.status === "draft" && (!canEdit || viewingSelectedVersion) ? <ProtocolReadWorkspace document={<ActiveProtocolView protocol={currentProtocol} studyCode={study.study_code} />} history={history} /> : null}
      {currentProtocol && currentProtocol.status !== "draft" ? <ProtocolReadWorkspace document={<ActiveProtocolView protocol={currentProtocol} studyCode={study.study_code} />} history={history} /> : null}
      {currentProtocol?.status === "draft" ? history : null}
    </div>
  );
}
