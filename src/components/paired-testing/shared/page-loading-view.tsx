import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const rows = Array.from({ length: 5 }, (_, index) => index);

export function PageLoadingView({ className }: { className?: string }) {
  return <div aria-busy="true" aria-label="Loading page" className={cn("relative min-h-full overflow-hidden px-4 py-6 sm:px-6 lg:px-8", className)}>
    <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/10"><div className="route-progress-bar h-full w-1/3 bg-primary" /></div>
    <div className="mx-auto w-full max-w-7xl animate-pulse">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5"><div className="space-y-3"><div className="h-2.5 w-24 rounded-sm bg-primary/25" /><div className="h-7 w-56 max-w-[65vw] rounded-sm bg-secondary" /><div className="h-3 w-80 max-w-[80vw] rounded-sm bg-secondary/70" /></div><LoaderCircle className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" /></div>
      <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">{rows.slice(0, 3).map((row) => <div key={row} className="bg-background p-4"><div className="h-2.5 w-20 rounded-sm bg-secondary" /><div className="mt-3 h-6 w-16 rounded-sm bg-secondary/80" /></div>)}</div>
      <div className="mt-6 overflow-hidden rounded-md border border-border"><div className="flex items-center justify-between border-b border-border bg-card/35 px-4 py-3"><div className="h-3 w-36 rounded-sm bg-secondary" /><div className="h-8 w-24 rounded-sm bg-secondary/80" /></div><div className="divide-y divide-border">{rows.map((row) => <div key={row} className="grid min-h-14 grid-cols-[1.5fr_1fr_100px] items-center gap-4 px-4"><div className="h-3 w-3/4 rounded-sm bg-secondary" /><div className="h-3 w-2/3 rounded-sm bg-secondary/75" /><div className="h-6 w-16 justify-self-end rounded-sm bg-secondary/75" /></div>)}</div></div>
    </div>
    <span className="sr-only">Loading the requested page</span>
  </div>;
}
