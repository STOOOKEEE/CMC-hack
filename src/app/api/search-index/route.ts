import { getSearchIndex } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listing = await getSearchIndex();
    return Response.json(listing, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch (e) {
    console.error("[wrapscout] search index unavailable:", (e as Error).message);
    return Response.json({ error: "Search index temporarily unavailable" }, { status: 503 });
  }
}
