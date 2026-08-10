import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  org: "juan17md",
  project: "muv-gestion",
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
