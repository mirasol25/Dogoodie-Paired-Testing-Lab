import { AppShell } from "@/components/paired-testing/layout/app-shell";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";

export const dynamic = "force-dynamic";

export default async function PairedTestingLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireActiveUser("/paired-testing-demo");
  const activeStudy = await getActiveStudy();

  return (
    <AppShell
      user={{ email: profile.email, displayName: profile.displayName, role: profile.role }}
      activeStudy={activeStudy ? {
        id: activeStudy.id,
        code: activeStudy.study_code,
        name: activeStudy.name,
        status: activeStudy.status,
        currency: activeStudy.default_currency,
      } : null}
    >
      {children}
    </AppShell>
  );
}
