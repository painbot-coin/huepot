import path from "path";
import type { NextConfig } from "next";

const chainNode = path.join(process.cwd(), "src/lib/chain.ts");
const chainEdge = path.join(process.cwd(), "src/lib/chain.edge.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "nodemailer"],
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
