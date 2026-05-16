import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.fal.media",
      },
      {
        protocol: "https",
        hostname: "fal.media",
      },
    ],
  },
  experimental: {
    // Product images can be several MB — the default 1 MB cap rejects them
    // before our Server Action sees the request.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
