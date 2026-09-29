import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["wagmi", "@wagmi/core", "@wagmi/connectors", "viem"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: [
        "localhost:3000",
        "localhost:3300",
        "127.0.0.1:3000",
        "127.0.0.1:3300",
        "40.160.146.251:3000",
        "vibecodingdiscover.com",
        "www.vibecodingdiscover.com",
      ],
    },
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
