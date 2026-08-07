import { CarFront } from "lucide-react";
import type { ProviderServiceOption, Study } from "@/lib/data/studies";

function configuredServiceIds(study: Study) {
  const configuration = study.configuration;
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return [];
  const ids = (configuration as Record<string, unknown>).platform_service_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

export function configuredStudyServices(study: Study, services: ProviderServiceOption[]) {
  const ids = configuredServiceIds(study);
  const selected = ids.map((id) => services.find((service) => service.id === id)).filter((service): service is ProviderServiceOption => Boolean(service));
  return selected.filter((service, index) => selected.findIndex((candidate) => candidate.id === service.id) === index);
}

export function StudyServiceContext({ study, services, className = "" }: { study: Study; services: ProviderServiceOption[]; className?: string }) {
  const unique = configuredStudyServices(study, services);
  if (!unique.length) return null;
  return <section className={`flex flex-wrap items-center gap-2 border-y border-border py-3 ${className}`}><div className="flex items-center gap-2"><CarFront className="size-4 text-primary" /><span className="text-[10px] uppercase text-muted-foreground">Testing service</span></div><div className="flex flex-wrap gap-2">{unique.map((service) => <span key={service.id} className="rounded-md border border-primary/25 bg-primary/[0.045] px-2.5 py-1 text-xs font-medium"><span className="text-primary">{service.platformName}</span><span className="text-muted-foreground"> · </span>{service.serviceName}</span>)}</div><span className="text-[10px] text-muted-foreground">{study.study_type === "cross_platform_comparison" ? "Cross-platform comparison" : "Within-platform comparison"}</span></section>;
}
