import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StudyMembersManager } from "@/components/paired-testing/studies/study-members-manager";
import { requireRole } from "@/lib/auth/server";
import { listEligibleStudyAccounts, listStudyMembers } from "@/lib/data/study-members";
import { listAccessibleStudies } from "@/lib/data/studies";
import { canManageStudyCoordinators } from "@/lib/auth/study-member-permissions";

export default async function StudyMembersPage({ params }: { params: Promise<{ studyId: string }> }) {
  const identity = await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/studies");
  const { studyId } = await params;
  const studies = await listAccessibleStudies();
  const study = studies.find((item) => item.id === studyId);
  if (!study) notFound();
  const [members, eligibleAccounts] = await Promise.all([listStudyMembers(study.id), listEligibleStudyAccounts(study.id)]);
  return <div className="space-y-6"><PageHeader eyebrow={`${study.study_code} - Study access`} title="Study members" description={study.name} actions={<Button asChild variant="outline"><Link href="/paired-testing-demo/studies"><ArrowLeft className="size-4" />Back to studies</Link></Button>} /><StudyMembersManager studyId={study.id} members={members} eligibleAccounts={eligibleAccounts} canManageCoordinators={canManageStudyCoordinators(identity.profile.role)} /></div>;
}
