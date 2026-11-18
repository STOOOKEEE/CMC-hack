import fs from "node:fs";

/** Loads .env.local then .env (if present) and returns the CMC key, or exits with a clear message. */
export function requireApiKey(command: string): string {
  for (const file of [".env.local", ".env"]) {
    if (fs.existsSync(file)) process.loadEnvFile(file);
  }
  const key = process.env.CMC_API_KEY;
  if (!key) {
    console.error(
      `CMC_API_KEY is not set.\n` +
        `Copy .env.example to .env.local and add your CoinMarketCap API key, or run:\n` +
        `  CMC_API_KEY=your-key npm run ${command}`,
    );
    process.exit(1);
  }
  return key;
}
