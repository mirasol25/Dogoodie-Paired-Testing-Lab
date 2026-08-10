import { ReportLibrary } from "@/components/paired-testing/reports/report-library";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireRole } from "@/lib/auth/server";
import { listStudyMatchedPairs, listStudyReviews } from "@/lib/data/matched-pairs";
import { listAccessibleStudies } from "@/lib/data/studies";
import { classifyReportPairs } from "@/lib/reports/report-classification";

export default async function ReportsPage() {
  const identity = await requireRole(["test_coordinator", "expert_reviewer", "law_firm_viewer"], "/reports");
  const accessible = await listAccessibleStudies();
  const studies = identity.profile.role === "law_firm_viewer"
    ? accessible.filter((study) => ["completed", "archived"].includes(study.status))
    : accessible;
  const items = await Promise.all(studies.map(async (study) => {
    const pairs = await listStudyMatchedPairs(study.id);
    const reviews = await listStudyReviews(pairs.map((pair) => pair.id));
    const classification = classifyReportPairs(pairs, reviews);
    return { id: study.id, code: study.study_code, name: study.name, status: study.status, updatedAt: study.updated_at, matchedPairs: pairs.length, usablePairs: classification.included.length, pendingReviews: classification.pending.length, targetPairs: study.target_pair_count };
  }));
  return <div className="space-y-6"><PageHeader eyebrow="Study outputs" title="Reports" description="Browse interim and final descriptive reports for every study you can access." /><ReportLibrary items={items} /></div>;
}
