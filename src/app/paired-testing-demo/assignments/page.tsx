import { redirect } from "next/navigation";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";

export default async function AssignmentsRedirectPage() {
  await requireRole(["test_coordinator", "tester"], "/assignments");
  const study = await getActiveStudy();
  if (!study) return <div className="space-y-6"><PageHeader eyebrow="Collection operations" title="Paired Assignments" description="Select or create a study before scheduling paired tests." /><div className="border-y border-border py-12 text-center text-sm text-muted-foreground">No accessible study is available.</div></div>;
  redirect(`/studies/${study.id}/assignments`);
}
