import { notFound } from "next/navigation";
import { StudyWorkspaceNav } from "@/components/paired-testing/studies/study-workspace-nav";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";

export default async function StudyRouteLayout({ children, params }: LayoutProps<"/paired-testing-demo/studies/[studyId]">) {
  const identity = await requireActiveUser("/studies");
  const { studyId } = await params;
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  return (
    <div className="min-w-0">
      <div className="mb-1 min-w-0 text-[10px] font-semibold uppercase text-muted-foreground sm:flex sm:items-center sm:gap-2">
        <span className="mono block truncate text-primary sm:shrink-0">{study.study_code}</span>
        <span aria-hidden="true" className="hidden sm:inline">/</span>
        <span className="mt-0.5 block truncate sm:mt-0">{study.name}</span>
      </div>
      <StudyWorkspaceNav studyId={study.id} role={identity.profile.role} />
      {children}
    </div>
  );
}
