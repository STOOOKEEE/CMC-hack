/**
 * Rebuilds fixtures/demo-snapshot/ from the SYNTHETIC raw fixtures in fixtures/cmc/,
 * through the same code path as the real snapshot. Served only when there is no API key
 * and no real snapshot; the UI labels it "Demo data".
 *
 *   npm run demo-snapshot
 */
import path from "node:path";
import { createFixtureEndpoints } from "../src/lib/cmc/fixtureEndpoints";
import { writeSnapshot } from "../src/lib/data/snapshotWriter";

async function main() {
  const dir = path.join("fixtures", "demo-snapshot");
  const result = await writeSnapshot(createFixtureEndpoints(path.join("fixtures", "cmc")), dir, { generatedAt: "2026-11-18T10:00:00.000Z" });
  console.log(`Demo snapshot written to ${dir}/: ${result.assets} assets.`);
}

main();
