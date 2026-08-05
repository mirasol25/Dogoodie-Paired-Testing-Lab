import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, Flag, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tones: Record<string, { className: string; icon: typeof CheckCircle2 }> = {
  valid: { className: "border-primary/25 bg-primary/10 text-primary", icon: CheckCircle2 },
  complete: { className: "border-primary/25 bg-primary/10 text-primary", icon: CheckCircle2 },
  accepted: { className: "border-primary/25 bg-primary/10 text-primary", icon: CheckCircle2 },
  warning: { className: "border-amber-400/25 bg-amber-400/10 text-amber-300", icon: AlertTriangle },
  flagged: { className: "border-amber-400/25 bg-amber-400/10 text-amber-300", icon: Flag },
  invalid: { className: "border-red-400/25 bg-red-400/10 text-red-300", icon: XCircle },
  rejected: { className: "border-red-400/25 bg-red-400/10 text-red-300", icon: XCircle },
  missing: { className: "border-red-400/25 bg-red-400/10 text-red-300", icon: XCircle },
  pending: { className: "border-slate-400/25 bg-slate-400/10 text-slate-300", icon: Clock3 },
  incomplete: { className: "border-slate-400/25 bg-slate-400/10 text-slate-300", icon: CircleDashed },
  pass: { className: "border-primary/25 bg-primary/10 text-primary", icon: CheckCircle2 },
  fail: { className: "border-red-400/25 bg-red-400/10 text-red-300", icon: XCircle },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const normalized = status.toLowerCase().replaceAll(" ", "_");
  const tone = tones[normalized] ?? tones.pending;
  const Icon = tone.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]", tone.className, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

