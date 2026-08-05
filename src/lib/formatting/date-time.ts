import { demoConfig } from "@/config/paired-testing-demo.config";

export function formatDemoDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: demoConfig.study.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatDemoDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: demoConfig.study.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
