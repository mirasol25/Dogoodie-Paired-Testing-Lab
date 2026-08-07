import type { ResolvedScreenshotService, ServiceValidationStatus } from "./schemas";

export type OCRService = { id: string; name: string; service_code: string; metadata: unknown };

export function normalizeServiceAlias(value: string) {
  return value.toLocaleLowerCase().replace(/&/g, " and ").replace(/[\-_]/g, " ").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

function aliases(service: OCRService) {
  const metadata = service.metadata && typeof service.metadata === "object" && !Array.isArray(service.metadata) ? service.metadata as Record<string, unknown> : {};
  const configured = Array.isArray(metadata.ocr_aliases) ? metadata.ocr_aliases.filter((alias): alias is string => typeof alias === "string") : [];
  return [service.name, service.service_code, ...configured];
}

export function resolveScreenshotService(platformServices: OCRService[], detectedLabel: string | null): ResolvedScreenshotService {
  if (!detectedLabel) return { rawDetectedLabel: null, platformServiceId: null, platformServiceName: null, resolution: "unresolved" };
  const normalized = normalizeServiceAlias(detectedLabel);
  const match = platformServices.find((service) => aliases(service).some((alias) => {
    const normalizedAlias = normalizeServiceAlias(alias);
    if (normalizedAlias === normalized) return true;

    // A selected-card label is often followed by its passenger icon/count.
    // OCR can turn that icon into `&`, which normalizes to `and` above:
    // `UberX &4` -> `uberx and 4`. Treat only that terminal UI metadata as
    // ignorable; do not broadly prefix-match different ride products.
    const passengerCountSuffix = new RegExp(`^${escapeRegExp(normalizedAlias)}\\s+(?:and\\s*)?\\d{1,2}$`);
    return passengerCountSuffix.test(normalized);
  }));
  return match ? { rawDetectedLabel: detectedLabel, platformServiceId: match.id, platformServiceName: match.name, resolution: "resolved" } : { rawDetectedLabel: detectedLabel, platformServiceId: null, platformServiceName: null, resolution: "unresolved" };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function validateRequiredService(requiredPlatformServiceId: string, resolvedPlatformServiceId: string | null): ServiceValidationStatus {
  return !resolvedPlatformServiceId ? "unverified" : resolvedPlatformServiceId === requiredPlatformServiceId ? "matched" : "mismatched";
}
