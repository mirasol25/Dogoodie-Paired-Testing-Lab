"use client";

import { useState, useTransition } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createInitialProtocolAction } from "@/app/paired-testing-demo/protocol/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateProtocolDetails({ study }: { study: { id: string; name: string; studyCode: string; studyQuestion: string | null; isolatedVariable: string | null } }) {
  const [title, setTitle] = useState(`${study.name} Testing Protocol`);
  const [description, setDescription] = useState("");
  const [testerAValue, setTesterAValue] = useState("");
  const [testerBValue, setTesterBValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (title.trim().length < 3) {
      setError("Enter a protocol title.");
      return;
    }
    if (testerAValue.trim().length < 2 || testerBValue.trim().length < 2) {
      setError("Enter the isolated-variable value for both testers.");
      return;
    }
    if (testerAValue.trim().toLocaleLowerCase() === testerBValue.trim().toLocaleLowerCase()) {
      setError("Tester A and Tester B must have different isolated-variable values.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createInitialProtocolAction({ studyId: study.id, title, description, testerAValue, testerBValue });
      if (result.ok) toast.success(result.message);
      else {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return (
    <section className="space-y-5 border-y border-border py-6">
      <div><p className="label-kicker">Protocol details</p><h2 className="mt-1.5 text-lg font-semibold">Create the initial draft</h2></div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="protocol-title">Protocol title</Label><Input id="protocol-title" value={title} onChange={(event) => { setTitle(event.target.value); setError(null); }} aria-invalid={Boolean(error)} /></div>
        <div className="space-y-2"><Label>Protocol code</Label><Input value={`${study.studyCode}-P001`} disabled className="mono" /></div>
        <div className="space-y-2"><Label>Version</Label><Input value="v1.0" disabled className="mono" /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="protocol-description">Description</Label><Textarea id="protocol-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></div>
      </div>
      <div className="grid gap-4 border-l-2 border-primary pl-4 md:grid-cols-2"><div><p className="text-xs text-muted-foreground">Study question</p><p className="mt-2 text-sm leading-6">{study.studyQuestion}</p></div><div><p className="text-xs text-muted-foreground">Isolated variable</p><p className="mt-2 text-sm leading-6">{study.isolatedVariable}</p></div></div>
      <div className="space-y-3"><div><h3 className="text-sm font-semibold">Paired isolated-variable values</h3><p className="mt-1 text-xs text-muted-foreground">This is the one intended difference between the matched testers.</p></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="tester-a-value">Tester A value</Label><Input id="tester-a-value" value={testerAValue} onChange={(event) => { setTesterAValue(event.target.value); setError(null); }} placeholder="Example: Standard account" maxLength={120} /></div><div className="space-y-2"><Label htmlFor="tester-b-value">Tester B value</Label><Input id="tester-b-value" value={testerBValue} onChange={(event) => { setTesterBValue(event.target.value); setError(null); }} placeholder="Example: Subscription account" maxLength={120} /></div></div></div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end"><Button type="button" onClick={submit} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}{pending ? "Creating..." : "Create v1.0 draft"}</Button></div>
    </section>
  );
}
