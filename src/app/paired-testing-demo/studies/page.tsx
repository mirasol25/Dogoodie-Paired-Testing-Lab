import { StudiesManager } from "@/components/paired-testing/studies/studies-manager";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listAccessibleStudies, listProviderServiceOptions } from "@/lib/data/studies";

export default async function StudiesPage() {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  const [studies, activeStudy, providerOptions] = await Promise.all([
    listAccessibleStudies(),
    getActiveStudy(),
    listProviderServiceOptions(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Study management"
        title="Studies"
        description="Create controlled studies, define an initial public route, and choose the study used throughout the workspace."
      />
      <StudiesManager studies={studies} activeStudyId={activeStudy?.id ?? null} providerOptions={providerOptions} />
    </div>
  );
}
