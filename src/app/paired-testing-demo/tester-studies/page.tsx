import { notFound } from "next/navigation";
import { TesterStudiesClient } from "@/components/paired-testing/studies/tester-studies-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listAccessibleStudies } from "@/lib/data/studies";
import { listStudyAssignments } from "@/lib/data/assignments";

export default async function TesterStudiesPage() {
  const identity = await requireActiveUser("/paired-testing-demo/tester-studies");
  if (identity.profile.role !== "tester") notFound();
  const [studies, activeStudy] = await Promise.all([listAccessibleStudies(), getActiveStudy()]);
  const assignmentGroups = await Promise.all(studies.map(async (study) => ({ study, assignments: await listStudyAssignments(study.id) })));
  const rows = assignmentGroups.map(({ study, assignments }) => {
    const ownSlots = assignments.flatMap((assignment) => {
      const slot = assignment.testers.find((tester) => tester.userId === identity.user.id);
      return slot ? [slot] : [];
    });
    return {
      study,
      workload: {
        assigned: ownSlots.length,
        needsAction: ownSlots.filter((slot) => ["assigned", "ready", "in_progress"].includes(slot.status)).length,
        submitted: ownSlots.filter((slot) => slot.status === "submitted").length,
      },
    };
  });
  return <div className="space-y-6"><PageHeader eyebrow="Tester workspace" title="My Studies" description="Select a study to view its assigned sessions and testing workflow." /><TesterStudiesClient rows={rows} activeStudyId={activeStudy?.id ?? null} /></div>;
}
