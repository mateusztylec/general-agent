import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@general-agent/agent",
    "@general-agent/database",
    "@general-agent/sandbox",
  ],
};

export default nextConfig;
