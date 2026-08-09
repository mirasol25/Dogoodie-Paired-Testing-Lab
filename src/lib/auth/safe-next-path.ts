export const DEFAULT_AUTHENTICATED_PATH = "/";

const protectedRoots = [
  "/dashboard", "/protocol", "/assignments", "/pairs", "/evidence",
  "/audit", "/reports", "/admin", "/device-profile", "/studies",
  "/submission", "/review-studies", "/tester-studies", "/view-studies",
];

export function getSafeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.includes("\\")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  try {
    const base = new URL("https://dogoodie.internal");
    const candidate = new URL(value, base);
    const isInternal = candidate.origin === base.origin;
    const isProtectedApp = candidate.pathname === DEFAULT_AUTHENTICATED_PATH
      || candidate.pathname === "/paired-testing-demo"
      || candidate.pathname.startsWith("/paired-testing-demo/")
      || protectedRoots.some((root) => candidate.pathname === root || candidate.pathname.startsWith(`${root}/`));

    if (!isInternal || !isProtectedApp) return DEFAULT_AUTHENTICATED_PATH;
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
}
