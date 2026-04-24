import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    // Server Actions are stable in Next 15, but keeping this ready if we need tweaks.
  },
  images: {
    remotePatterns: [
      // Allow loading images stored in Supabase Storage buckets.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default config;
