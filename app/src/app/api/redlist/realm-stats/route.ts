import { NextResponse } from "next/server";
import { getPrecomputedRealmStats } from "@/lib/data/species-store";
import { getRealmStats } from "@/lib/data/scoped-taxa-summary-duckdb";
import { CACHE_1H } from "@/lib/cache-headers";

/**
 * Per-realm totals across ALL species — the Realm view's landing chart reads this
 * instead of loading the full species dataset client-side just to aggregate it in
 * the browser (the mistake Country view's landing map made and had to undo:
 * several seconds of blank map while 2M+ rows downloaded, for three numbers).
 *
 * Served from the precomputed data/realm-stats.json, like /api/redlist/country-stats
 * next to it: the chart is always all-species scope, so there is nothing for a live
 * query to compose with and a static read paints immediately instead of waiting on
 * DuckDB — which on a cold serverless container means opening the parquet over R2
 * first. The live query stays as a fallback for syncs built before that pass
 * existed, so this route works on the current sync and gets faster on the next one.
 *
 * Counted once per realm a species is assessed in, so a Freshwater;Marine species
 * is in both totals — which is why totalAssessed comes back as its own figure
 * rather than something the client could get by summing them. See getRealmStats.
 */
export async function GET() {
  try {
    const precomputed = getPrecomputedRealmStats();
    if (precomputed) {
      return NextResponse.json(precomputed, { headers: CACHE_1H });
    }
    const { realms, totalAssessed } = await getRealmStats();
    return NextResponse.json({ realms, totalAssessed }, { headers: CACHE_1H });
  } catch (error) {
    console.error("Realm stats error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Realm stats failed: ${message}` },
      { status: 500 }
    );
  }
}
