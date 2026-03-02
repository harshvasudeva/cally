import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for self-hosted deployments
  output: "standalone",

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // Powered-by header removed for security
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Server external packages (for nodemailer, bcryptjs etc.)
  serverExternalPackages: ["nodemailer", "bcryptjs"],

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@fullcalendar/core",
      "@fullcalendar/react",
    ],
  },
};

export default nextConfig;
