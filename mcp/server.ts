/**
 * WrapScout MCP server (stdio): lets Claude, Cursor or any MCP client ask
 * "which tokenized version of X should I buy?" and get the same deterministic answer as the website.
 *
 *   claude mcp add wrapscout -- npx tsx /path/to/CMC-hack/mcp/server.ts
 *
 * Uses CMC_API_KEY (live data) when set, else data/snapshot/, else the synthetic demo snapshot.
 */
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { bestVersionTool, compareTool, searchTool } from "./tools";

// Resolve data/ and fixtures/ relative to the project, whatever directory the client starts us from.
process.chdir(path.resolve(__dirname, ".."));
for (const file of [".env.local", ".env"]) if (fs.existsSync(file)) process.loadEnvFile(file);

const server = new McpServer({ name: "wrapscout", version: "0.1.0" });
const asText = (text: string) => ({ content: [{ type: "text" as const, text }] });

server.registerTool(
  "search_tokenized_assets",
  {
    title: "Search tokenized assets",
    description: "Find stocks, ETFs, commodities or funds that have tokenized versions tracked by CoinMarketCap.",
    inputSchema: { query: z.string().min(1).describe("Ticker or name, e.g. 'NVDA', 'gold', 'S&P 500'") },
    annotations: { readOnlyHint: true },
  },
  async ({ query }) => asText((await searchTool(query)).text),
);

server.registerTool(
  "best_tokenized_version",
  {
    title: "Which tokenized version should I buy?",
    description:
      "For one real-world asset (by ticker), rank every tokenized version by liquidity, price fidelity and market reach, " +
      "and return the best pick with reasons, where to buy it, and what is wrong with the others. Not financial advice.",
    inputSchema: { symbol: z.string().min(1).describe("Underlying ticker, e.g. 'NVDA', 'TSLA', 'XAU'") },
    annotations: { readOnlyHint: true },
  },
  async ({ symbol }) => asText((await bestVersionTool(symbol)).text),
);

server.registerTool(
  "compare_tokenized_versions",
  {
    title: "Compare all tokenized versions",
    description: "List every tokenized version of an asset with issuer, chain, label, score, price, volume and warnings.",
    inputSchema: { symbol: z.string().min(1).describe("Underlying ticker, e.g. 'NVDA'") },
    annotations: { readOnlyHint: true },
  },
  async ({ symbol }) => asText((await compareTool(symbol)).text),
);

server.connect(new StdioServerTransport()).catch((e) => {
  console.error("[wrapscout-mcp] failed to start:", e);
  process.exit(1);
});
