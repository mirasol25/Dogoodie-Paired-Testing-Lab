import { notFound } from "next/navigation";
import { AssignmentDetails } from "@/components/paired-testing/assignments/assignment-details";
import { requireActiveUser } from "@/lib/auth/server";
import { canManageAssignments } from "@/lib/auth/assignment-permissions";
import { getActiveStudy } from "@/lib/data/active-study";
import { getAssignmentOperationalSummary, getOwnAssignmentSubmission, getOwnSubmissionEvidence, getStudyAssignment } from "@/lib/data/assignments";

export default async function AssignmentDetailsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const identity = await requireActiveUser(`/paired-testing-demo/assignments/${assignmentId}`);
  const study = await getActiveStudy();
  if (!study) notFound();
  const assignment = await getStudyAssignment(study.id, assignmentId);
  if (!assignment) notFound();
  const canManage = canManageAssignments(identity.profile.role);
  const submission = await getOwnAssignmentSubmission(assignment.id, identity.user.id);
  const evidence = await getOwnSubmissionEvidence(submission?.id ?? null, identity.user.id);
  const operations = canManage ? await getAssignmentOperationalSummary(assignment.id) : null;
  return <AssignmentDetails study={study} assignment={assignment} submission={submission} evidence={evidence} currentUserId={identity.user.id} canManage={canManage} isAdmin={identity.profile.role === "admin"} operations={operations} />;
}
