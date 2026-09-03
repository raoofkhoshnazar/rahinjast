import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = isGithubPages
  ? {
      output: "export",
      basePath: "/rahinjast",
      assetPrefix: "/rahinjast/",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
