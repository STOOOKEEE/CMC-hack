import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Snapshot files are read with fs at runtime; make sure serverless bundles (e.g. Vercel) ship them.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*.json", "./fixtures/demo-snapshot/**/*.json"],
  },
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
