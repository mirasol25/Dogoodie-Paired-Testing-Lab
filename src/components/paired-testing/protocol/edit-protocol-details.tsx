"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { saveProtocolDetailsAction } from "@/app/paired-testing-demo/protocol/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProtocolDraftNavigation } from "@/components/paired-testing/protocol/protocol-draft-navigation";
import type { Protocol } from "@/lib/data/protocols";

export function EditProtocolDetails({ protocol }: { protocol: Protocol }) {
  const initial = { title: protocol.title, description: protocol.description ?? "", testerA: protocol.tester_a_value ?? "", testerB: protocol.tester_b_value ?? "" };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const navigation = useProtocolDraftNavigation();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function save() {
    if (values.testerA.trim().toLocaleLowerCase() === values.testerB.trim().toLocaleLowerCase()) {
      setError("Tester A and Tester B must have different isolated-variable values.");
      return;
    }
    startTransition(async () => {
      const result = await saveProtocolDetailsAction({ studyId: protocol.study_id, protocolId: protocol.id, title: values.title, description: values.description, testerAValue: values.testerA, testerBValue: values.testerB });
      if (result.ok) {
        setSaved(values);
        toast.success(result.message);
        navigation?.goToStep("conditions");
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return (
    <section className="space-y-5 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Draft configuration</p><h2 className="mt-1.5 text-lg font-semibold">Protocol details</h2></div><Badge variant={dirty ? "outline" : "secondary"}>{dirty ? "Unsaved changes" : <><Check className="size-3" />Saved</>}</Badge></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="edit-protocol-title">Title</Label><Input id="edit-protocol-title" value={values.title} onChange={(event) => update("title", event.target.value)} maxLength={160} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="edit-protocol-description">Description</Label><Textarea id="edit-protocol-description" value={values.description} onChange={(event) => update("description", event.target.value)} maxLength={1000} /></div>
        <div className="space-y-2"><Label htmlFor="edit-tester-a">Tester A value</Label><Input id="edit-tester-a" value={values.testerA} onChange={(event) => update("testerA", event.target.value)} placeholder="Standard account" maxLength={120} /></div>
        <div className="space-y-2"><Label htmlFor="edit-tester-b">Tester B value</Label><Input id="edit-tester-b" value={values.testerB} onChange={(event) => update("testerB", event.target.value)} placeholder="Subscription account" maxLength={120} /></div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end"><Button type="button" onClick={save} disabled={pending || !dirty}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Saving..." : "Save and continue"}</Button></div>
    </section>
  );
}
