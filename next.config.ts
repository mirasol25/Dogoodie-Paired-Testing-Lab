import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tesseract spawns a Node worker using its package-relative __dirname.
  // Keep it external so Turbopack does not rewrite that path to C:\\ROOT.
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
