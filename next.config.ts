import path from "path";
import type { NextConfig } from "next";

const chainNode = path.join(process.cwd(), "src/lib/chain.ts");
const chainEdge = path.join(process.cwd(), "src/lib/chain.edge.ts");

const nextConfig: NextConfig = {
  // A build normally rewrites .next underneath the process still serving from
  // it, which leaves a window where a route that has not been loaded yet
  // cannot find its manifest. Setting this lets a deploy build somewhere else
  // and move the finished directory into place in one step.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@prisma/client", "prisma"],
  async redirects() {
    return [
      { source: "/signup", destination: "/signin", permanent: true },
      { source: "/forgot-password", destination: "/signin", permanent: true },
      { source: "/reset-password", destination: "/signin", permanent: true },
      { source: "/verify-email", destination: "/signin", permanent: true },
    ];
  },
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime !== "nodejs") {
      config.resolve = config.resolve ?? {};
      const alias = config.resolve.alias;
      if (Array.isArray(alias)) {
        alias.push({ name: "@/lib/chain", alias: chainEdge });
        alias.push({ name: chainNode, alias: chainEdge });
      } else {
        config.resolve.alias = {
          ...alias,
          "@/lib/chain": chainEdge,
          [chainNode]: chainEdge,
        };
      }
    }
    return config;
  },
};

export default nextConfig;
