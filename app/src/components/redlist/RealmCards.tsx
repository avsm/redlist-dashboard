"use client";

import type { RealmStats } from "@/lib/data/scoped-taxa-summary-duckdb";

/**
 * Realm View's landing chooser — one card per IUCN realm (Terrestrial,
 * Freshwater, Marine), the realm equivalent of Country View's landing map.
 * Clicking one scopes the taxa summary table beside/below it to that realm, the
 * same way clicking a country does (see RedListView's handleRealmDrilldown).
 *
 * Three cards, not a chart: the point of the landing state is to pick one, and
 * the three numbers are so far apart (132k / 42k / 20k) that bars would mostly
 * show the reader that terrestrial species are numerous, which isn't the
 * question this view exists to answer.
 */

// Per-realm accents, matching the Realm filter buttons under More Filters, so the
// same realm reads as the same color wherever it's shown.
const REALM_STYLES: Record<string, { dot: string; ring: string; tint: string; label: string }> = {
  Terrestrial: {
    dot: "bg-amber-500",
    ring: "ring-amber-500 border-amber-500",
    tint: "bg-amber-50 dark:bg-amber-950/30",
    label: "Land-based habitats — forest, grassland, desert, caves.",
  },
  Freshwater: {
    dot: "bg-cyan-500",
    ring: "ring-cyan-500 border-cyan-500",
    tint: "bg-cyan-50 dark:bg-cyan-950/30",
    label: "Rivers, lakes, wetlands and other inland waters.",
  },
  Marine: {
    dot: "bg-blue-600",
    ring: "ring-blue-600 border-blue-600",
    tint: "bg-blue-50 dark:bg-blue-950/30",
    label: "Seas and oceans, from the shoreline to the deep sea.",
  },
};

interface Props {
  realms: RealmStats[];
  selected: Set<string>;
  /** Plain click replaces the selection; ctrl/cmd-click toggles — the caller
   * reads the modifier off the event, exactly as the country map does. */
  onSelect: (realm: string, event: React.MouseEvent) => void;
}

export default function RealmCards({ realms, selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {realms.map(({ realm, species, outdated }) => {
          const style = REALM_STYLES[realm];
          const isSelected = selected.has(realm);
          const percentOutdated = species > 0 ? (outdated / species) * 100 : 0;
          return (
            <button
              key={realm}
              onClick={(e) => onSelect(realm, e)}
              aria-pressed={isSelected}
              className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                isSelected
                  ? `${style.ring} ring-2 ${style.tint}`
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} aria-hidden />
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{realm}</span>
              </div>
              <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {species.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Red List assessed species</div>
              <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                {outdated.toLocaleString()} need updating ({percentOutdated.toFixed(0)}%)
              </div>
              <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 leading-snug">{style.label}</div>
            </button>
          );
        })}
      </div>
      {/* Two things a reader would otherwise have to work out from the numbers
          themselves, both of which change how the cards should be read — so
          they're stated rather than left to be inferred. */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
        A species assessed in more than one realm (a migratory fish, say) is counted in each, so the three
        cards add up to more than the total number of assessments. Realm is recorded on the assessment
        itself, so these counts — and everything below them — cover assessed species only; species not yet
        assessed for the Red List have no realm recorded, which is why the described-species and
        observation columns are hidden in this view.
      </p>
    </div>
  );
}
