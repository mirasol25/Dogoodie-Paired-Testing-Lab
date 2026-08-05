import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ReportScopeAlert() {
  return <Alert className="border-teal-400/20 bg-teal-400/[0.055]">
    <Info className="size-4 text-teal-300" aria-hidden="true" />
    <AlertTitle className="text-xs font-semibold uppercase text-teal-200">Scope and interpretation</AlertTitle>
    <AlertDescription className="mt-1 max-w-5xl text-xs leading-5 text-muted-foreground">
      This package contains descriptive results from the selected paired-testing study. A pricing difference alone does not establish unlawful discrimination; results must be interpreted under the approved protocol, repeated observations, statistical analysis, alternative explanations, and applicable law.
    </AlertDescription>
  </Alert>;
}
