import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` rewrite our shared AGENTS.md.
  agentRules: false,
};

export default nextConfig;
