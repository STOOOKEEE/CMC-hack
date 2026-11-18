import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering model: pages that read live data opt in with
  // `export const dynamic = "force-dynamic"`. Data caching is done in src/lib/cache.ts.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
