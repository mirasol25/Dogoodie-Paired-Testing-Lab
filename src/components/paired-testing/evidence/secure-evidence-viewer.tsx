"use client";

import { Eye, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { createEvidenceAccessAction } from "@/app/paired-testing-demo/evidence/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SecureEvidenceViewer({ evidenceId, filename, mimeType, label = "View file" }: { evidenceId: string; filename: string; mimeType: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string>();

  async function show() {
    setLoading(true);
    const result = await createEvidenceAccessAction(evidenceId);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setUrl(result.url);
    setOpen(true);
  }

  return <>
    <Button variant="outline" size="sm" onClick={() => void show()} disabled={loading}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
      {loading ? "Loading..." : label}
    </Button>
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setUrl(undefined); }}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,1100px)] max-w-none flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Evidence viewer</DialogTitle>
          <DialogDescription className="break-all">{filename}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-black/35 p-4">
          {url && mimeType.startsWith("image/") ? <Image src={url} alt={`Evidence file ${filename}`} width={1600} height={1200} unoptimized className="h-auto max-h-[75vh] w-auto max-w-full object-contain" /> : null}
          {url && mimeType.startsWith("video/") ? <video src={url} controls preload="metadata" className="max-h-[75vh] max-w-full" aria-label={`Evidence recording ${filename}`} /> : null}
          {url && !mimeType.startsWith("image/") && !mimeType.startsWith("video/") ? <p className="text-sm text-muted-foreground">This file type cannot be previewed in the viewer.</p> : null}
        </div>
        <div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">Private signed preview | Access expires after 60 seconds</div>
      </DialogContent>
    </Dialog>
  </>;
}
