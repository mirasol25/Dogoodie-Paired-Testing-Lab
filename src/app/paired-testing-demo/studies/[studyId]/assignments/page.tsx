import { notFound } from "next/navigation";
import { AssignmentsClient } from "@/components/paired-testing/assignments/assignments-client";
import { TesterAssignmentsClient } from "@/components/paired-testing/assignments/tester-assignments-client";
import { canManageAssignments } from "@/lib/auth/assignment-permissions";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { expireOverdueAssignments, getAssignmentSetupOptions, listAssignmentTesterOptions, listStudyAssignments } from "@/lib/data/assignments";
import { getStudyCollectionCapacity } from "@/lib/data/collection-capacity";

export default async function StudyAssignmentsPage({ params }: PageProps<"/paired-testing-demo/studies/[studyId]/assignments">) {
  const { studyId } = await params;
  const identity = await requireRole(["test_coordinator", "tester"], `/studies/${studyId}/assignments`);
  const study = await getActiveStudy(studyId);
  if (!study) notFound();
  if (identity.profile.role === "tester") {
    const assignments = await listStudyAssignments(study.id);
    const items = assignments.flatMap((assignment) => {
      const slot = assignment.testers.find((tester) => tester.userId === identity.user.id);
      return slot ? [{ study, assignment, slot }] : [];
    }).sort((left, right) => new Date(left.assignment.scheduled_start ?? 0).getTime() - new Date(right.assignment.scheduled_start ?? 0).getTime());
    return <TesterAssignmentsClient study={study} items={items} />;
  }
  const canManage = canManageAssignments(identity.profile.role);
  if (canManage && ["active", "paused"].includes(study.status)) await expireOverdueAssignments(study.id);
  const [assignments, setupOptions, testerOptions, capacity] = await Promise.all([
    listStudyAssignments(study.id),
    getAssignmentSetupOptions(study.id, study.configuration),
    canManage ? listAssignmentTesterOptions(study.id) : Promise.resolve([]),
    getStudyCollectionCapacity(study.id),
  ]);
  return <AssignmentsClient study={study} assignments={assignments} setupOptions={setupOptions} testerOptions={testerOptions} canManage={canManage} capacity={capacity} />;
}
