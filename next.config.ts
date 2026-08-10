import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Detect clients that are still running assets from a previous Vercel build.
  deploymentId: process.env.VERCEL_GIT_COMMIT_SHA,
  // Tesseract spawns a Node worker using its package-relative __dirname.
  // Keep it external so Turbopack does not rewrite that path to C:\\ROOT.
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "@google-cloud/vision"],
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [{
      source: "/paired-testing-demo/:path*",
      destination: "/:path*",
      permanent: true,
    }];
  },
  async rewrites() {
    const routes = [
      "dashboard", "protocol", "assignments", "pairs", "evidence", "audit",
      "reports", "admin", "device-profile", "studies", "submission",
      "review-studies", "tester-studies", "view-studies",
    ];
    return {
      beforeFiles: [
        { source: "/", destination: "/paired-testing-demo" },
        ...routes.map((route) => ({
          source: `/${route}/:path*`,
          destination: `/paired-testing-demo/${route}/:path*`,
        })),
      ],
    };
  },
};

export default nextConfig;
