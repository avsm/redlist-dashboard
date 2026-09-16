import { NextResponse } from "next/server";
import { getRealmStats } from "@/lib/data/scoped-taxa-summary-duckdb";
import { CACHE_1H } from "@/lib/cache-headers";

/**
 * Per-realm totals across ALL species — the Realm view's landing chart reads this
 * instead of loading the full species dataset client-side just to aggregate it in
 * the browser (the mistake Country view's landing map made and had to undo: several
 * seconds of blank map while 2M+ rows downloaded, for three numbers).
 *
 * Counted once per realm a species is assessed in, so a Freshwater;Marine species
 * is in both totals — see getRealmStats' own doc comment.
 */
export async function GET() {
  try {
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
