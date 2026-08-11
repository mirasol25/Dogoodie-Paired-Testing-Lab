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
      <StudyWorkspaceNav studyId={study.id} role={identity.profile.role} />
      <div className="mb-6 flex min-w-0 items-center gap-2 border-b border-border/70 pb-3 text-[10px] font-semibold uppercase tracking-wide">
        <span className="mono shrink-0 text-primary">{study.study_code}</span>
        <span aria-hidden="true" className="text-muted-foreground">/</span>
        <span className="truncate text-muted-foreground">{study.name}</span>
      </div>
      {children}
    </div>
  );
}
