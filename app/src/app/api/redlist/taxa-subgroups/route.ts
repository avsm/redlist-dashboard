import { NextRequest, NextResponse } from "next/server";
import { getPrecomputedChildrenSummaries } from "@/lib/data/species-store";
import { getScopedChildrenSummaries, scopeWhere } from "@/lib/data/scoped-taxa-summary-duckdb";
import { getLiveRankChildren } from "@/lib/data/live-taxa-children";
import { findNode, hasChildren } from "@/lib/taxonomy-utils";
import { isLiveDrilldownNode, nextDynamicRank } from "@/lib/dynamic-taxon";
import { CACHE_1H } from "@/lib/cache-headers";

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get("nodeId");
  // One or more comma-separated values each, composing by AND — see
  // taxa-summary/route.ts's own comment.
  const countries = request.nextUrl.searchParams.get("country")?.split(",").map((c) => c.trim()).filter(Boolean) ?? [];
  const realms = request.nextUrl.searchParams.get("realm")?.split(",").map((r) => r.trim()).filter(Boolean) ?? [];
  const where = scopeWhere(countries, realms);
  const scoped = where !== null;

  if (!nodeId) {
    return NextResponse.json(
      { error: "Missing nodeId parameter" },
      { status: 400 }
    );
  }

  try {
    // Live, arbitrary-depth taxonomic drilldown (see dynamic-taxon.ts) — takes
    // over from the static tree + precomputed JSON for DYNAMIC_DRILLDOWN_ROOTS,
    // scoped or not (Phase 7: country-scoping ports onto the same
    // getLiveRankChildren mechanism via an extra scope predicate ANDed
    // into the assessed-side query only, mirroring getScopedChildrenSummaries'
    // existing precedent of omitting CoL/GBIF fields — no country or realm
    // dimension exists for either — when extraWhere is set; realm rides that
    // exact same path, it's just a different column in the same predicate).
    if (isLiveDrilldownNode(nodeId)) {
      const nextRank = nextDynamicRank(nodeId);
      // No further rank below genus — the leaf is the existing species-list view.
      if (!nextRank) return NextResponse.json({ subgroups: [], scoped }, { headers: CACHE_1H });
      const subgroups = await getLiveRankChildren(nodeId, nextRank, where ?? undefined);
      return NextResponse.json({ subgroups, scoped }, { headers: CACHE_1H });
    }

    if (!findNode(nodeId) || !hasChildren(nodeId)) {
      return NextResponse.json({ subgroups: [], scoped }, { headers: CACHE_1H });
    }

    // Scoped summaries carry zeroed estimatedDescribed/gbifNeSpeciesCount
    // (neither country nor realm exists in that data) — `scoped` tells the client
    // to hide those columns rather than render a misleading 0.
    const subgroups = where
      ? await getScopedChildrenSummaries(where, nodeId)
      : getPrecomputedChildrenSummaries(nodeId);
    return NextResponse.json({ subgroups, scoped }, { headers: CACHE_1H });
  } catch (error) {
    console.error(`Node children summary error for ${nodeId}:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Node summary failed: ${message}` },
      { status: 500 }
    );
  }
}
