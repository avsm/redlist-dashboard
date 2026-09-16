export const GITHUB_REPO_URL = "https://github.com/shaneweisz/redlist-dashboard";

/**
 * Prefilled GitHub "new issue" links — the dashboard's way of handing someone a
 * draft they can edit and submit themselves.
 *
 * Deliberately plain links with the body in the query string, not API calls: no
 * token to hold, no auth to build, no endpoint that can be spammed, and the
 * reporter reviews and edits the text on GitHub before anything is submitted.
 */

/**
 * The general "something to say" draft, from the site footer. Kept almost empty
 * on purpose — the footer link is offered for questions, feedback and feature
 * requests alike, so anything more specific than a prompt would be putting words
 * in the reporter's mouth. No title is prefilled either: an empty one leaves
 * GitHub's own placeholder showing and its submit button disabled until they
 * write one, which is better than a vague "Feedback" they have to clear.
 */
export function buildGeneralIssueUrl({ pageUrl, repoUrl }: { pageUrl?: string; repoUrl?: string } = {}): string {
  const body = [
    "<!-- A question, something that looks wrong, or a feature you'd like —",
    "     a sentence is plenty. -->",
    "",
    ...(pageUrl ? ["", "---", "", `From ${pageUrl}`] : []),
  ].join("\n");
  return `${repoUrl ?? GITHUB_REPO_URL}/issues/new?${new URLSearchParams({ body }).toString()}`;
}

/**
 * Builds a prefilled "this breakdown looks wrong" GitHub issue URL from a
 * # Described Species popover.
 *
 * The audience is a specialist group member who knows their taxonomy far better
 * than this dashboard does and has just noticed the described-species breakdown
 * covering the wrong families — the single most likely correction anyone will
 * ever want to send us, and until now there was nowhere to send it from. What
 * they see in the popover is what lands in the issue.
 */

export interface BreakdownIssueRow {
  /** Display name, already resolved (e.g. "Syngnathidae"). */
  name: string;
  /** # Described, per Catalogue of Life. */
  count: number;
  /** Assessed → Total. */
  trueAssessed: number;
  /** Assessed → No 1:1 CoL Match. */
  noMatch: number;
  /** # Not Evaluated. */
  neCount: number;
}

// GitHub rejects very long URLs (and some browsers cap sooner), so a breakdown
// with hundreds of rows is truncated rather than silently producing a link that
// 414s on click. The cap is on rows, not characters, because a row is what a
// reader can actually be told about ("first 40 of 312 shown").
const MAX_ROWS = 40;

export interface BreakdownIssueInput {
  /** The node the popover is describing, e.g. "Seahorses & Pipefishes". */
  groupLabel: string;
  /** What the first column holds — "Family", "Order", ... */
  rankLabel: string;
  rows: BreakdownIssueRow[];
  /** The CoL release the numbers came from, e.g. "COL26.6 XR". */
  sourceLabel: string;
  /** The dashboard URL the reporter was looking at, so we can reproduce it. */
  pageUrl?: string;
  repoUrl?: string;
}

export function buildBreakdownIssueBody({
  groupLabel, rankLabel, rows, sourceLabel, pageUrl,
}: BreakdownIssueInput): string {
  const shown = rows.slice(0, MAX_ROWS);
  const header = `| ${rankLabel} | # Described | Assessed | No 1:1 CoL Match | # Not Evaluated |\n| --- | ---: | ---: | ---: | ---: |`;
  const body = shown
    .map((r) => `| ${r.name} | ${r.count} | ${r.trueAssessed} | ${r.noMatch} | ${r.neCount} |`)
    .join("\n");
  const truncated = rows.length > shown.length
    ? `\n\n_First ${shown.length} of ${rows.length} rows shown._`
    : "";

  return [
    "### Currently",
    "",
    `The dashboard breaks down **${groupLabel}**'s described species like this (source: ${sourceLabel}):`,
    "",
    `${header}\n${body}${truncated}`,
    "",
    "### We believe it should be",
    "",
    "<!-- Replace this line with the breakdown you'd expect — which groups belong",
    "     in this one and which don't, and why. Anything you can point us at (a",
    "     published circumscription, the specialist group's own scope) helps. -->",
    "",
    ...(pageUrl ? ["---", "", `Reported from ${pageUrl}`] : []),
  ].join("\n");
}

export function buildBreakdownIssueUrl(input: BreakdownIssueInput): string {
  const repo = input.repoUrl ?? GITHUB_REPO_URL;
  const params = new URLSearchParams({
    title: `Described-species breakdown for ${input.groupLabel} looks wrong`,
    body: buildBreakdownIssueBody(input),
    labels: "data-breakdown",
  });
  return `${repo}/issues/new?${params.toString()}`;
}
