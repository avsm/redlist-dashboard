"use client";

import type { RealmStats } from "@/lib/data/scoped-taxa-summary-duckdb";

/**
 * Realm View's landing chooser — one bar per IUCN realm, the realm equivalent of
 * Country View's landing map. Clicking one scopes the taxa table below it to that
 * realm (see RedListView's handleRealmDrilldown).
 *
 * A bar chart rather than three stat cards because the question the view opens on
 * is comparative — how much of the Red List is marine — and length answers that at
 * a glance where three separate numbers make the reader do the division. The bars
 * are also the selector, so the comparison and the control are the same object.
 */

// Per-realm hues, matching the Realm filter buttons under More Filters — color
// follows the entity, so the same realm reads as the same color wherever it
// appears. Validated as a categorical set (CVD ΔE 20.9 worst adjacent pair); the
// sub-3:1 contrast against the surface is covered by every bar being directly
// labelled with its realm name, never color alone.
const REALM_COLOR: Record<string, string> = {
  Terrestrial: "#f59e0b",
  Freshwater: "#06b6d4",
  Marine: "#2563eb",
};

interface Props {
  realms: RealmStats[];
  /** Every assessed species counted once — the share denominator. */
  totalAssessed: number;
  selected: Set<string>;
  /** Plain click replaces the selection; ctrl/cmd-click toggles — the caller
   * reads the modifier off the event, exactly as the country map does. */
  onSelect: (realm: string, event: React.MouseEvent) => void;
}

export default function RealmBars({ realms, totalAssessed, selected, onSelect }: Props) {
  // Bars are scaled against the largest realm, not against totalAssessed: the
  // widest bar then spans the axis and the others are read against it, which is
  // the comparison the chart is for. Scaling to the total would leave every bar
  // in the left three-quarters of the space for no gain.
  const max = Math.max(...realms.map((r) => r.species), 1);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
      <div className="flex flex-col gap-2.5">
        {realms.map(({ realm, species, outdated }) => {
          const share = totalAssessed > 0 ? (species / totalAssessed) * 100 : 0;
          const pctOutdated = species > 0 ? (outdated / species) * 100 : 0;
          const isSelected = selected.has(realm);
          const dimmed = selected.size > 0 && !isSelected;
          return (
            <button
              key={realm}
              onClick={(e) => onSelect(realm, e)}
              aria-pressed={isSelected}
              title={`${species.toLocaleString()} of ${totalAssessed.toLocaleString()} assessed species (${share.toFixed(1)}%) · ${outdated.toLocaleString()} need updating (${pctOutdated.toFixed(1)}%)`}
              className={`group flex items-center gap-3 w-full text-left rounded-md px-1 py-1 transition-opacity cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${dimmed ? "opacity-45" : ""}`}
            >
              <span className={`w-24 shrink-0 text-sm tabular-nums ${isSelected ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                {realm}
              </span>
              <span className="flex-1 min-w-0 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(species / max) * 100}%`, backgroundColor: REALM_COLOR[realm] }}
                />
              </span>
              <span className={`w-20 shrink-0 text-right text-sm tabular-nums ${isSelected ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
                {species.toLocaleString()}
              </span>
              <span className="w-14 shrink-0 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {share.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>
      {/* The one thing the numbers can't say for themselves: the shares sum to
          more than 100%, and a reader who notices deserves the reason. */}
      <p className="mt-2.5 pl-1 text-xs text-zinc-400 dark:text-zinc-500">
        Share of {totalAssessed.toLocaleString()} assessed species; a species assessed in two realms counts in both.
      </p>
    </div>
  );
}
