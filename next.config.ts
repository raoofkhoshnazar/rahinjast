import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = isGithubPages
  ? {
      output: "export",
      basePath: "/rahinjast",
      assetPrefix: "/rahinjast/",
      trailingSlash: true,
      images: { unoptimized: true },
      env: {
        NEXT_PUBLIC_BASE_PATH: "/rahinjast",
      },
    }
  : {
      env: {
        NEXT_PUBLIC_BASE_PATH: "",
      },
    };

export default nextConfig;
