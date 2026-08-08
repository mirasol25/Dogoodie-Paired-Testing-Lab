import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreateStudyForm } from "@/components/paired-testing/studies/studies-manager";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/server";
import { getStudyEditorInitialData, listProviderServiceOptions, listStudyIdsWithActiveProtocol } from "@/lib/data/studies";

export default async function EditStudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  const { studyId } = await params;
  const [initialData, providerOptions, activeProtocolStudyIds] = await Promise.all([
    getStudyEditorInitialData(studyId),
    listProviderServiceOptions(),
    listStudyIdsWithActiveProtocol(),
  ]);
  if (!initialData || initialData.study.status !== "draft" || activeProtocolStudyIds.includes(studyId)) notFound();
  return <div className="space-y-6">
    <PageHeader eyebrow={`${initialData.study.study_code} - Draft study`} title="Edit study" description="Update the study design, route, testing conditions, and schedule before protocol activation." actions={<Button asChild variant="outline"><Link href="/paired-testing-demo/studies"><ArrowLeft className="size-4" />Back to studies</Link></Button>} />
    <CreateStudyForm providerOptions={providerOptions} initialData={initialData} />
  </div>;
}
