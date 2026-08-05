import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({ label, value, note, icon }: { label: string; value: ReactNode; note?: string; icon?: ReactNode }) {
  return (
    <Card className="data-panel rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          {icon && <span className="text-primary/80">{icon}</span>}
        </div>
        <div className="numeric mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</div>
        {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}

