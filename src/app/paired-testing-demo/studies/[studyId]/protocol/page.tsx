import { notFound } from "next/navigation";
import { ProtocolManager } from "@/components/paired-testing/protocol/protocol-manager";
import { canManageProtocols } from "@/lib/auth/protocol-permissions";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyProtocols } from "@/lib/data/protocols";
import { listProviderServiceOptions } from "@/lib/data/studies";

export default async function StudyProtocolPage({ params, searchParams }: PageProps<"/paired-testing-demo/studies/[studyId]/protocol">) {
  const [{ studyId }, query] = await Promise.all([params, searchParams]);
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], `/studies/${studyId}/protocol`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  const [protocols, serviceOptions] = await Promise.all([listStudyProtocols(study.id), listProviderServiceOptions()]);
  const version = typeof query.version === "string" ? query.version : undefined;
  const step = query.step === "conditions" ? "conditions" : "details";
  return <ProtocolManager study={study} protocols={protocols} serviceOptions={serviceOptions} canManage={canManageProtocols(identity.profile.role)} accessRole={identity.profile.role} selectedVersion={version} initialConfigureStep={step} />;
}
