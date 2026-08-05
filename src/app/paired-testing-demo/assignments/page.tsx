import { AssignmentsClient } from "@/components/paired-testing/assignments/assignments-client";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { canManageAssignments } from "@/lib/auth/assignment-permissions";
import { requireRole } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { getAssignmentSetupOptions, listStudyAssignments } from "@/lib/data/assignments";
import { listStudyMembers } from "@/lib/data/study-members";

export default async function AssignmentsPage() {
  const identity = await requireRole(["test_coordinator", "tester"], "/paired-testing-demo/assignments");
  const study = await getActiveStudy();

  if (!study) {
    return <div className="space-y-6"><PageHeader eyebrow="Collection operations" title="Paired Assignments" description="Select or create a study before scheduling paired tests." /><div className="border-y border-border py-12 text-center text-sm text-muted-foreground">No accessible study is available.</div></div>;
  }

  const canManage = canManageAssignments(identity.profile.role);
  const [assignments, setupOptions, members] = await Promise.all([
    listStudyAssignments(study.id),
    getAssignmentSetupOptions(study.id, study.configuration),
    canManage ? listStudyMembers(study.id) : Promise.resolve([]),
  ]);
  const testerOptions = members.filter((member) => member.study_role === "tester" && member.membership_status === "active").map((member) => ({ id: member.user_id, displayName: member.display_name?.trim() || member.email, email: member.email }));
  return <AssignmentsClient study={study} assignments={assignments} setupOptions={setupOptions} testerOptions={testerOptions} canManage={canManage} />;
}
