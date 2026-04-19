import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(fileURLToPath(import.meta.url), "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: ["sharp", "@prisma/client", "pg"],
};

export default nextConfig;
