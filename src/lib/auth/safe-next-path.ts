export const DEFAULT_AUTHENTICATED_PATH = "/paired-testing-demo";

export function getSafeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.includes("\\")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  try {
    const base = new URL("https://dogoodie.internal");
    const candidate = new URL(value, base);
    const isInternal = candidate.origin === base.origin;
    const isProtectedApp = candidate.pathname === DEFAULT_AUTHENTICATED_PATH
      || candidate.pathname.startsWith(`${DEFAULT_AUTHENTICATED_PATH}/`);

    if (!isInternal || !isProtectedApp) return DEFAULT_AUTHENTICATED_PATH;
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
}
