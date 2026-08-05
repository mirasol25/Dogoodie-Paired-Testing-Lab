"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { saveValidationThresholdsAction } from "@/app/paired-testing-demo/protocol/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProtocolDraftNavigation } from "@/components/paired-testing/protocol/protocol-draft-navigation";
import type { Json } from "@/types/database.types";

interface ThresholdValues {
  preferredTime: number;
  maximumTime: number;
  preferredLocation: number;
  maximumLocation: number;
}

const defaults: ThresholdValues = {
  preferredTime: 5,
  maximumTime: 10,
  preferredLocation: 5,
  maximumLocation: 15,
};

function objectValue(value: Json, key: string): Json | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value[key] : undefined;
}

function numericValue(value: Json | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function readThresholds(configuration: Json): { configured: boolean; values: ThresholdValues } {
  const time = objectValue(configuration, "request_time_gap");
  const location = objectValue(configuration, "location_gap");
  const configured = Boolean(time && location);
  return {
    configured,
    values: {
      preferredTime: numericValue(objectValue(time ?? null, "preferred_max_seconds"), defaults.preferredTime),
      maximumTime: numericValue(objectValue(time ?? null, "maximum_seconds"), defaults.maximumTime),
      preferredLocation: numericValue(objectValue(location ?? null, "preferred_max_feet"), defaults.preferredLocation),
      maximumLocation: numericValue(objectValue(location ?? null, "maximum_feet"), defaults.maximumLocation),
    },
  };
}

function ThresholdPreview({ preferred, maximum, unit }: { preferred: number; maximum: number; unit: string }) {
  return <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border text-center text-xs"><div className="p-3"><span className="font-medium text-emerald-500">Pass</span><span className="mt-1 block text-muted-foreground">0-{preferred} {unit}</span></div><div className="p-3"><span className="font-medium text-amber-500">Warning</span><span className="mt-1 block text-muted-foreground">&gt;{preferred}-{maximum} {unit}</span></div><div className="p-3"><span className="font-medium text-destructive">Fail</span><span className="mt-1 block text-muted-foreground">&gt;{maximum} {unit}</span></div></div>;
}

export function ValidationThresholdsForm({ studyId, protocolId, configuration }: { studyId: string; protocolId: string; configuration: Json }) {
  const initial = readThresholds(configuration);
  const [values, setValues] = useState(initial.values);
  const [saved, setSaved] = useState(initial.values);
  const [configured, setConfigured] = useState(initial.configured);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const navigation = useProtocolDraftNavigation();
  const dirty = !configured || JSON.stringify(values) !== JSON.stringify(saved);

  function update(key: keyof ThresholdValues, rawValue: string) {
    setValues((current) => ({ ...current, [key]: Number(rawValue) }));
    setError(null);
  }

  function save() {
    if (!Number.isInteger(values.preferredTime) || values.preferredTime < 1 || values.maximumTime <= values.preferredTime) {
      setError("Maximum request-time gap must exceed the preferred gap.");
      return;
    }
    if (!Number.isInteger(values.preferredLocation) || values.preferredLocation < 1 || values.maximumLocation <= values.preferredLocation) {
      setError("Maximum location gap must exceed the preferred gap.");
      return;
    }
    startTransition(async () => {
      const result = await saveValidationThresholdsAction({
        studyId,
        protocolId,
        preferredTimeGapSeconds: values.preferredTime,
        maximumTimeGapSeconds: values.maximumTime,
        preferredLocationGapFeet: values.preferredLocation,
        maximumLocationGapFeet: values.maximumLocation,
      });
      if (result.ok) {
        setSaved(values);
        setConfigured(true);
        toast.success(result.message);
        navigation?.goToStep("requirements");
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return (
    <section className="space-y-5 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Protocol configuration</p><h2 className="mt-1.5 text-lg font-semibold">Validation thresholds</h2></div><Badge variant={dirty ? "outline" : "secondary"}>{dirty ? "Unsaved changes" : <><Check className="size-3" />Saved</>}</Badge></div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4"><h3 className="text-sm font-semibold">Request-time gap</h3><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="preferred-time-gap">Preferred maximum (seconds)</Label><Input id="preferred-time-gap" type="number" min="1" max="3599" value={values.preferredTime} onChange={(event) => update("preferredTime", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="maximum-time-gap">Failure boundary (seconds)</Label><Input id="maximum-time-gap" type="number" min="2" max="3600" value={values.maximumTime} onChange={(event) => update("maximumTime", event.target.value)} /></div></div><ThresholdPreview preferred={values.preferredTime} maximum={values.maximumTime} unit="sec" /></div>
        <div className="space-y-4"><h3 className="text-sm font-semibold">Location-distance gap</h3><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="preferred-location-gap">Preferred maximum (feet)</Label><Input id="preferred-location-gap" type="number" min="1" max="5279" value={values.preferredLocation} onChange={(event) => update("preferredLocation", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="maximum-location-gap">Failure boundary (feet)</Label><Input id="maximum-location-gap" type="number" min="2" max="5280" value={values.maximumLocation} onChange={(event) => update("maximumLocation", event.target.value)} /></div></div><ThresholdPreview preferred={values.preferredLocation} maximum={values.maximumLocation} unit="ft" /></div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end"><Button type="button" onClick={save} disabled={pending || !dirty}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Saving..." : "Save and continue"}</Button></div>
    </section>
  );
}
