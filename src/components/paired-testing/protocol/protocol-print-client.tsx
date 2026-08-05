"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { ActiveProtocolView } from "@/components/paired-testing/protocol/active-protocol-view";
import { Button } from "@/components/ui/button";
import type { Protocol } from "@/lib/data/protocols";

export function ProtocolPrintClient({ protocol, studyCode, mode }: { protocol: Protocol; studyCode: string; mode: "print" | "pdf" }) {
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return <article className="mx-auto max-w-[8.5in] bg-background pb-10 print:max-w-none print:pb-0"><div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 p-3"><Button asChild variant="ghost"><Link href={`/paired-testing-demo/protocol?version=${encodeURIComponent(protocol.version)}`}><ArrowLeft className="size-4" />Back to protocol</Link></Button><Button type="button" onClick={() => window.print()}>{mode === "pdf" ? <Download className="size-4" /> : <Printer className="size-4" />}{mode === "pdf" ? "Save PDF" : "Print"}</Button></div><ActiveProtocolView protocol={protocol} studyCode={studyCode} showExportActions={false} /></article>;
}
