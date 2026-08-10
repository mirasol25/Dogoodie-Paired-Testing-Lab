import { AppShell } from "@/components/paired-testing/layout/app-shell";
import { requireActiveUser } from "@/lib/auth/server";
import { listAccessibleStudies } from "@/lib/data/studies";

export const dynamic = "force-dynamic";

export default async function PairedTestingLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireActiveUser("/paired-testing-demo");
  const accessible = await listAccessibleStudies();
  const dashboardStudies = profile.role === "law_firm_viewer"
    ? accessible.filter((study) => ["completed", "archived"].includes(study.status))
    : accessible;

  return (
    <AppShell
      user={{ email: profile.email, displayName: profile.displayName, role: profile.role }}
      dashboardStudies={dashboardStudies.map((study) => ({ id: study.id, code: study.study_code, name: study.name }))}
    >
      {children}
    </AppShell>
  );
}
