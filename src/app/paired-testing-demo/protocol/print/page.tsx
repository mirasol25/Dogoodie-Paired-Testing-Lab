import { notFound } from "next/navigation";
import { ProtocolPrintClient } from "@/components/paired-testing/protocol/protocol-print-client";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listStudyProtocols } from "@/lib/data/protocols";

export default async function ProtocolPrintPage({ searchParams }: { searchParams: Promise<{ version?: string; mode?: string }> }) {
  await requireActiveUser("/paired-testing-demo/protocol/print");
  const study = await getActiveStudy();
  const { version, mode } = await searchParams;
  if (!study || !version) notFound();
  const protocols = await listStudyProtocols(study.id);
  const protocol = protocols.find((item) => item.version === version);
  if (!protocol) notFound();
  return <ProtocolPrintClient protocol={protocol} studyCode={study.study_code} mode={mode === "pdf" ? "pdf" : "print"} />;
}
