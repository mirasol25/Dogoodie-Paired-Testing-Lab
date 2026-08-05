"use client";

import { useState, useTransition } from "react";
import { CopyPlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createProtocolVersionAction } from "@/app/paired-testing-demo/protocol/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateProtocolVersion({ studyId, protocolId, version }: { studyId: string; protocolId: string; version: string }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createProtocolVersionAction({ studyId, sourceProtocolId: protocolId, changeSummary: summary });
      if (result.ok) {
        setOpen(false);
        toast.success(result.message);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button type="button" variant="outline"><CopyPlus className="size-4" />Create new version</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create a new protocol version</DialogTitle><DialogDescription>The complete {version} configuration will be copied into an editable draft. {version} remains active until the new draft is activated.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="version-summary">Change summary</Label><Textarea id="version-summary" value={summary} onChange={(event) => { setSummary(event.target.value); setError(null); }} placeholder="Describe why this protocol needs to change" maxLength={500} />{error ? <p className="text-xs text-destructive">{error}</p> : null}</div><DialogFooter><DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="button" onClick={create} disabled={pending || summary.trim().length < 3}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <CopyPlus className="size-4" />}{pending ? "Creating..." : "Create draft"}</Button></DialogFooter></DialogContent></Dialog>;
}
