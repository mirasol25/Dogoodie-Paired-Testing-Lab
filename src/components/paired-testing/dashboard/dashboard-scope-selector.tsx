"use client";

import { Check, ChevronDown, LayoutDashboard, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DashboardStudyOption { id: string; code: string; name: string }

export function DashboardScopeSelector({ studies, selectedId, compact = false }: { studies: DashboardStudyOption[]; selectedId?: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = studies.find((study) => study.id === selectedId);
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? studies.filter((study) => `${study.code} ${study.name}`.toLowerCase().includes(search)) : studies;
  }, [query, studies]);

  function choose(id?: string) {
    setOpen(false);
    setQuery("");
    startTransition(() => router.push(id ? `/dashboard?study=${id}` : "/dashboard"));
  }

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant={compact ? "ghost" : "outline"} className={compact ? "h-auto min-h-10 max-w-[min(62vw,24rem)] justify-between gap-3 px-2" : "h-auto min-h-9 w-full justify-between gap-3 sm:w-80"} disabled={pending}>
        {compact ? <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/[0.07] text-primary"><LayoutDashboard className="size-4" /></span> : null}
        <span className="min-w-0 text-left">
          <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">{selected?.code ?? "ALL STUDIES"}</span>
          <span className="block truncate text-sm font-medium">{selected ? selected.name : "Portfolio Dashboard"}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </Button>
    </PopoverTrigger>
    <PopoverContent align={compact ? "start" : "end"} className="w-[min(92vw,27rem)] overflow-hidden p-0">
      <div className="border-b border-border bg-card/45 px-3 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">Dashboard scope</p>
        <p className="mt-1 text-xs text-muted-foreground">View combined analytics or focus on one study.</p>
      </div>
      <div className="border-b border-border p-2">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search study name or ID" className="pl-9" /></div>
      </div>
      <div className="max-h-72 overflow-y-auto p-1.5">
        <button type="button" onClick={() => choose()} className={cn("flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left hover:bg-secondary", !selectedId && "bg-primary/[0.08]")}><span className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary"><LayoutDashboard className="size-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">All studies</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Combined portfolio computations</span></span><Check className={cn("size-3.5 text-primary", selectedId && "invisible")} /></button>
        <div className="my-1 border-t border-border" />
        {visible.map((study) => <button key={study.id} type="button" onClick={() => choose(study.id)} className={cn("flex w-full items-start gap-3 rounded-sm px-3 py-2.5 text-left hover:bg-secondary", selectedId === study.id && "bg-primary/[0.08]")}><span className="min-w-0 flex-1"><span className="mono block text-[10px] text-primary">{study.code}</span><span className="mt-1 block text-xs font-medium leading-4">{study.name}</span></span><Check className={cn("mt-1 size-3.5 shrink-0 text-primary", selectedId !== study.id && "invisible")} /></button>)}
        {!visible.length ? <p className="px-3 py-8 text-center text-xs text-muted-foreground">No studies match your search.</p> : null}
      </div>
      <div className="border-t border-border bg-card/35 px-3 py-2 text-[10px] text-muted-foreground">{visible.length} of {studies.length} studies</div>
    </PopoverContent>
  </Popover>;
}
