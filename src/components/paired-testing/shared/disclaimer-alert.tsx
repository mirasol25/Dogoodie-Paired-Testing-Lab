import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { demoConfig } from "@/config/paired-testing-demo.config";

export function DisclaimerAlert({ compact = false }: { compact?: boolean }) {
  return (
    <Alert className="border-teal-400/20 bg-teal-400/[0.055] text-foreground">
      <Info className="size-4 text-teal-300" aria-hidden="true" />
      <AlertTitle className="text-xs font-semibold uppercase tracking-[0.1em] text-teal-200">
        {demoConfig.shortDisclaimer}
      </AlertTitle>
      {!compact && <AlertDescription className="mt-1 max-w-5xl text-xs leading-5 text-muted-foreground">{demoConfig.disclaimer}</AlertDescription>}
    </Alert>
  );
}

