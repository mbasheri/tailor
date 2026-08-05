import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the headless-chromium stack external so Next doesn't try to bundle the
  // browser binary into the serverless function.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // ...but `serverExternalPackages` alone doesn't trace @sparticuz/chromium's
  // `bin/` DATA files (the compressed Chromium binary, loaded at runtime via
  // fs, not a static import). Without this the pdf route throws at runtime:
  // "input directory .../@sparticuz/chromium/bin does not exist". Force those
  // files into the export-pdf function.
  outputFileTracingIncludes: {
    "/api/export-pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
