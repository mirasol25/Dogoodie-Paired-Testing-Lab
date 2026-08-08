import { CarFront } from "lucide-react";
import type { ProviderServiceOption, Study } from "@/lib/data/studies";

function studyConfiguration(study: Study) {
  const configuration = study.configuration;
  return configuration && typeof configuration === "object" && !Array.isArray(configuration)
    ? configuration as Record<string, unknown>
    : {};
}

function configuredServiceIds(study: Study) {
  const ids = studyConfiguration(study).platform_service_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

export function configuredStudyServiceSides(study: Study, services: ProviderServiceOption[]) {
  const configuration = studyConfiguration(study);
  const configuredIds = configuredServiceIds(study);
  const testerAId = typeof configuration.tester_a_service_id === "string" ? configuration.tester_a_service_id : configuredIds[0];
  const testerBId = typeof configuration.tester_b_service_id === "string" ? configuration.tester_b_service_id : configuredIds[1] ?? configuredIds[0];
  return {
    testerA: services.find((service) => service.id === testerAId),
    testerB: services.find((service) => service.id === testerBId),
  };
}

export function configuredStudyServices(study: Study, services: ProviderServiceOption[]) {
  const sides = configuredStudyServiceSides(study, services);
  return [sides.testerA, sides.testerB]
    .filter((service): service is ProviderServiceOption => Boolean(service))
    .filter((service, index, selected) => selected.findIndex((candidate) => candidate.id === service.id) === index);
}

function ServiceBadge({ label, service }: { label: string; service: ProviderServiceOption }) {
  return <span className="rounded-md border border-primary/25 bg-primary/[0.045] px-2.5 py-1 text-xs font-medium"><span className="mr-1 text-[9px] uppercase text-muted-foreground">{label}</span><span className="text-primary">{service.platformName}</span><span className="text-muted-foreground"> · </span>{service.serviceName}</span>;
}

export function StudyServiceContext({ study, services, className = "" }: { study: Study; services: ProviderServiceOption[]; className?: string }) {
  const sides = configuredStudyServiceSides(study, services);
  if (!sides.testerA) return null;
  const differs = Boolean(sides.testerB && sides.testerB.id !== sides.testerA.id);
  return <section className={`flex flex-wrap items-center gap-2 border-y border-border py-3 ${className}`}><div className="flex items-center gap-2"><CarFront className="size-4 text-primary" /><span className="text-[10px] uppercase text-muted-foreground">Testing service</span></div><div className="flex flex-wrap gap-2">{differs ? <><ServiceBadge label="Tester A" service={sides.testerA} />{sides.testerB ? <ServiceBadge label="Tester B" service={sides.testerB} /> : null}</> : <ServiceBadge label="Both" service={sides.testerA} />}</div><span className="text-[10px] text-muted-foreground">{study.study_type === "cross_platform_comparison" ? "Cross-platform comparison" : differs ? "Within-platform tier comparison" : "Within-platform same-tier comparison"}</span></section>;
}
