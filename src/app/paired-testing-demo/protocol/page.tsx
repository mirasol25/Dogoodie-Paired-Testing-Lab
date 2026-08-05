import { ProtocolManager } from "@/components/paired-testing/protocol/protocol-manager";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyProtocols } from "@/lib/data/protocols";
import { canManageProtocols } from "@/lib/auth/protocol-permissions";

export default async function ProtocolPage({ searchParams }: { searchParams: Promise<{ version?: string; step?: string }> }) {
  const { version, step } = await searchParams;
  const identity = await requireActiveUser("/paired-testing-demo/protocol");
  const study = await getActiveStudy();

  if (!study) {
    return <div className="space-y-6"><PageHeader eyebrow="Protocol management" title="Testing Protocol" description="Select or create a study before defining its testing protocol." /><div className="border-y border-border py-12 text-center text-sm text-muted-foreground">No accessible study is available.</div></div>;
  }

  const protocols = await listStudyProtocols(study.id);
  const canManage = canManageProtocols(identity.profile.role);
  return <ProtocolManager study={study} protocols={protocols} canManage={canManage} accessRole={identity.profile.role} selectedVersion={version} initialConfigureStep={step === "conditions" ? "conditions" : "details"} />;
}

