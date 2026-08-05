"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { discardProtocolDraftAction } from "@/app/paired-testing-demo/protocol/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DiscardProtocolDraft({ studyId, protocolId, version, hasActiveVersion }: { studyId: string; protocolId: string; version: string; hasActiveVersion: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function discard() {
    startTransition(async () => {
      const result = await discardProtocolDraftAction({ studyId, protocolId });
      if (result.ok) {
        setOpen(false);
        toast.success(result.message);
        router.push("/paired-testing-demo/protocol");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button type="button" variant="destructive"><Trash2 className="size-4" />Discard draft</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Discard {version} draft?</DialogTitle><DialogDescription>{hasActiveVersion ? "The active protocol will remain unchanged." : "This is the initial protocol draft. You can create a new initial draft afterward."} Draft configuration and unsaved version work will be permanently removed. Active and superseded versions cannot be discarded.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="button" variant="destructive" onClick={discard} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{pending ? "Discarding..." : "Discard draft"}</Button></DialogFooter></DialogContent></Dialog>;
}
