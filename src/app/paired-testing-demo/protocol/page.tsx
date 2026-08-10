import { redirect } from "next/navigation";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";

export default async function ProtocolRedirectPage({ searchParams }: { searchParams: Promise<{ version?: string; step?: string }> }) {
  await requireActiveUser("/protocol");
  const [study, query] = await Promise.all([getActiveStudy(), searchParams]);
  if (!study) return <div className="space-y-6"><PageHeader eyebrow="Protocol management" title="Testing Protocol" description="Select or create a study before defining its testing protocol." /><div className="border-y border-border py-12 text-center text-sm text-muted-foreground">No accessible study is available.</div></div>;
  const params = new URLSearchParams();
  if (query.version) params.set("version", query.version);
  if (query.step) params.set("step", query.step);
  redirect(`/studies/${study.id}/protocol${params.size ? `?${params}` : ""}`);
}
