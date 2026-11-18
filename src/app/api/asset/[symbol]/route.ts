import { getAssetView } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Public JSON API: GET /api/asset/nvda → the same ranked view the page renders. */
export async function GET(_req: Request, ctx: RouteContext<"/api/asset/[symbol]">) {
  const { symbol } = await ctx.params;
  try {
    const view = await getAssetView(decodeURIComponent(symbol));
    if (!view) return Response.json({ error: `No tokenized asset found for "${symbol}"` }, { status: 404 });
    return Response.json(view, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    console.error("[wrapscout] asset view unavailable:", (e as Error).message);
    return Response.json({ error: "Live data temporarily unavailable" }, { status: 503 });
  }
}
