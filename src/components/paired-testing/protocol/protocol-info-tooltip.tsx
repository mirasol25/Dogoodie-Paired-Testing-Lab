"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ProtocolInfoTooltip({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild>
      <button type="button" aria-label={label} onClick={() => setOpen((current) => !current)} className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" sideOffset={8} className="max-w-72 whitespace-normal leading-5">
      {children}
    </TooltipContent>
  </Tooltip>;
}
