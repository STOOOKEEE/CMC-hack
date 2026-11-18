/**
 * Writes data/snapshot/ — every searchable tokenized asset as served by the live API —
 * so the site keeps working (with a dated banner) if CMC errors or the quota runs out.
 *
 *   npm run snapshot
 *
 * Env: SNAPSHOT_MIN_INTERVAL_MS (default 2100, ≈28 calls/min), SNAPSHOT_MARKET_PAIRS_TOP (default 25).
 */
import path from "node:path";
import { createEndpoints } from "../src/lib/cmc/endpoints";
import { writeSnapshot } from "../src/lib/data/snapshotWriter";
import { requireApiKey } from "./env";

async function main() {
  const apiKey = requireApiKey("snapshot");
  const api = createEndpoints({ apiKey, minIntervalMs: Number(process.env.SNAPSHOT_MIN_INTERVAL_MS ?? 2100) });
  const dir = path.join("data", "snapshot");
  const started = Date.now();
  const result = await writeSnapshot(api, dir, {
    marketPairsTop: Number(process.env.SNAPSHOT_MARKET_PAIRS_TOP ?? 25),
    onProgress: (done, total) => {
      if (done % 25 === 0 || done === total) console.log(`  ${done}/${total} assets`);
    },
  });
  console.log(
    `Snapshot written to ${dir}/: ${result.assets} assets, ${result.skipped.length} skipped, ` +
      `${result.degraded.length} degraded, ${api.creditsUsed()} credits, ${Math.round((Date.now() - started) / 1000)} s.`,
  );
  if (result.degraded.length > 0) {
    console.warn(
      `Degraded assets (some parts missing, e.g. chain or registrant info): ${result.degraded.join(", ")}.
` +
        `Re-run later or check fixtures with \`npm run explore\` before committing.`,
    );
  }
}

main().catch((e) => {
  console.error("Snapshot failed — the previous snapshot (if any) was left untouched.\n", e);
  process.exit(1);
});
