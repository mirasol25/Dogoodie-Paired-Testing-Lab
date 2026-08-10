import { notFound } from "next/navigation";
import { AssignmentDetails } from "@/components/paired-testing/assignments/assignment-details";
import { requireActiveUser } from "@/lib/auth/server";
import { canManageAssignments } from "@/lib/auth/assignment-permissions";
import { getActiveStudy } from "@/lib/data/active-study";
import { getAccessibleAssignmentStudyId, getAssignmentOperationalSummary, getAssignmentRouteGuidance, getLatestTesterTechnicalProfile, getOwnAssignmentSubmission, getOwnSubmissionEvidence, getStudyAssignment } from "@/lib/data/assignments";
import { getAccessibleStudyById } from "@/lib/data/studies";
import { getRestoredSubmissionScreenshotValidation } from "@/lib/data/screenshot-ocr";
import { createClient } from "@/lib/supabase/server";

// OCR is bounded by the deployment platform. The extraction path uses one
// worker, while this allows enough time for cold starts on production.
export const maxDuration = 60;

export default async function AssignmentDetailsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const identity = await requireActiveUser(`/paired-testing-demo/assignments/${assignmentId}`);
  const study = identity.profile.role === "tester"
    ? await (async () => {
      const studyId = await getAccessibleAssignmentStudyId(assignmentId);
      return studyId ? getAccessibleStudyById(studyId) : null;
    })()
    : await getActiveStudy();
  if (!study) notFound();
  const assignment = await getStudyAssignment(study.id, assignmentId);
  if (!assignment) notFound();
  const canManage = canManageAssignments(identity.profile.role);
  const [submission, technicalProfile, routeGuidance] = await Promise.all([
    getOwnAssignmentSubmission(assignment.id, identity.user.id),
    getLatestTesterTechnicalProfile(identity.user.id),
    getAssignmentRouteGuidance(assignment),
  ]);
  const evidence = await getOwnSubmissionEvidence(submission?.id ?? null, identity.user.id);
  const screenshotValidation = submission ? await getRestoredSubmissionScreenshotValidation(submission.id) : null;
  const latestScreenshot = evidence.filter((item) => item.evidence_type === "screenshot").at(-1);
  let screenshotPreviewUrl = "";
  if (latestScreenshot) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from(latestScreenshot.storage_bucket).createSignedUrl(latestScreenshot.storage_path, 3600);
    screenshotPreviewUrl = data?.signedUrl ?? "";
  }
  const operations = canManage ? await getAssignmentOperationalSummary(assignment.id) : null;
  return <AssignmentDetails study={study} assignment={assignment} routeGuidance={routeGuidance} submission={submission} technicalProfile={technicalProfile} evidence={evidence} screenshotValidation={screenshotValidation} screenshotPreviewUrl={screenshotPreviewUrl} currentUserId={identity.user.id} canManage={canManage} operations={operations} />;
}
