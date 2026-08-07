import { AppShell } from "@/components/paired-testing/layout/app-shell";
import { configuredStudyServices } from "@/components/paired-testing/shared/study-service-context";
import { requireActiveUser } from "@/lib/auth/server";
import { getActiveStudy } from "@/lib/data/active-study";
import { listProviderServiceOptions } from "@/lib/data/studies";

export const dynamic = "force-dynamic";

export default async function PairedTestingLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireActiveUser("/paired-testing-demo");
  const [activeStudy, providerOptions] = await Promise.all([getActiveStudy(), listProviderServiceOptions()]);
  const serviceLabel = activeStudy
    ? configuredStudyServices(activeStudy, providerOptions).map((service) => `${service.platformName} · ${service.serviceName}`).join(" vs ") || null
    : null;

  return (
    <AppShell
      user={{ email: profile.email, displayName: profile.displayName, role: profile.role }}
      activeStudy={activeStudy ? {
        id: activeStudy.id,
        code: activeStudy.study_code,
        name: activeStudy.name,
        status: activeStudy.status,
        currency: activeStudy.default_currency,
        serviceLabel,
      } : null}
    >
      {children}
    </AppShell>
  );
}
