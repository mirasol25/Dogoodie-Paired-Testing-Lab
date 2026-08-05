"use client";

import type { ReactNode } from "react";
import { FileText, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProtocolReadWorkspace({ document, history }: { document: ReactNode; history: ReactNode }) {
  return (
    <Tabs defaultValue="document" className="gap-0">
      <TabsList variant="line" className="h-auto w-full justify-start gap-5 border-b border-border bg-transparent p-0">
        <TabsTrigger value="document" className="min-h-10 flex-none px-1 text-xs"><FileText className="size-3.5" />Protocol document</TabsTrigger>
        <TabsTrigger value="history" className="min-h-10 flex-none px-1 text-xs"><History className="size-3.5" />Version history</TabsTrigger>
      </TabsList>
      <TabsContent value="document" className="mt-5">{document}</TabsContent>
      <TabsContent value="history" className="mt-5">{history}</TabsContent>
    </Tabs>
  );
}
