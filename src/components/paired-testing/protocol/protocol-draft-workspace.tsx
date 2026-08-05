"use client";

import type { ReactNode } from "react";
import { ClipboardCheck, FileText, GitCompareArrows, ListChecks, MapPinned, Scale, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProtocolDraftWorkspaceProps {
  version: string;
  details: ReactNode;
  conditions: ReactNode;
  thresholds: ReactNode;
  requirements: ReactNode;
  exclusions: ReactNode;
  comparison?: ReactNode;
  preview: ReactNode;
  activation: ReactNode;
  discard: ReactNode;
}

const persistentContent = "mt-5 data-[state=inactive]:hidden";

export function ProtocolDraftWorkspace({ version, details, conditions, thresholds, requirements, exclusions, comparison, preview, activation, discard }: ProtocolDraftWorkspaceProps) {
  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Draft workspace</p><div className="mt-1.5 flex items-center gap-2"><h2 className="text-lg font-semibold">Prepare {version}</h2><Badge variant="outline">Draft</Badge></div><p className="mt-2 text-xs text-muted-foreground">Configure the rules, inspect changes, then review the exact document before activation.</p></div>{discard}</div>
      <Tabs defaultValue="configure" className="gap-0">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-md border border-border bg-secondary/30 p-1">
          <TabsTrigger value="configure" className="min-h-9 min-w-32 px-3"><ListChecks className="size-4" />Configure</TabsTrigger>
          {comparison ? <TabsTrigger value="changes" className="min-h-9 min-w-32 px-3"><GitCompareArrows className="size-4" />Changes</TabsTrigger> : null}
          <TabsTrigger value="review" className="min-h-9 min-w-40 px-3"><ClipboardCheck className="size-4" />Review &amp; activate</TabsTrigger>
        </TabsList>

        <TabsContent value="configure" forceMount className={persistentContent}>
          <Tabs defaultValue="details" className="gap-0">
            <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto border-b border-border pb-1">
              <TabsTrigger value="details" className="min-h-9 px-3"><FileText className="size-3.5" />1. Details</TabsTrigger>
              <TabsTrigger value="conditions" className="min-h-9 px-3"><ShieldCheck className="size-3.5" />2. Conditions</TabsTrigger>
              <TabsTrigger value="thresholds" className="min-h-9 px-3"><Scale className="size-3.5" />3. Thresholds</TabsTrigger>
              <TabsTrigger value="requirements" className="min-h-9 px-3"><ClipboardCheck className="size-3.5" />4. Evidence</TabsTrigger>
              <TabsTrigger value="exclusions" className="min-h-9 px-3"><MapPinned className="size-3.5" />5. Exclusions</TabsTrigger>
            </TabsList>
            <TabsContent value="details" forceMount className={persistentContent}>{details}</TabsContent>
            <TabsContent value="conditions" forceMount className={persistentContent}>{conditions}</TabsContent>
            <TabsContent value="thresholds" forceMount className={persistentContent}>{thresholds}</TabsContent>
            <TabsContent value="requirements" forceMount className={persistentContent}>{requirements}</TabsContent>
            <TabsContent value="exclusions" forceMount className={persistentContent}>{exclusions}</TabsContent>
          </Tabs>
        </TabsContent>
        {comparison ? <TabsContent value="changes" forceMount className={persistentContent}>{comparison}</TabsContent> : null}
        <TabsContent value="review" forceMount className={persistentContent}><div className="space-y-6">{preview}{activation}</div></TabsContent>
      </Tabs>
    </section>
  );
}
