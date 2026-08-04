import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the headless-chromium stack external so Next doesn't try to bundle the
  // browser binary into the serverless function.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
