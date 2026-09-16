import { describe, it, expect } from "vitest";
import { buildBreakdownIssueBody, buildBreakdownIssueUrl, GITHUB_REPO_URL } from "@/lib/col-breakdown-issue";

const rows = [
  { name: "Syngnathidae", count: 313, trueAssessed: 286, noMatch: 2, neCount: 25 },
  { name: "Solenostomidae", count: 7, trueAssessed: 4, noMatch: 0, neCount: 3 },
];
const input = {
  groupLabel: "Seahorses & Pipefishes",
  rankLabel: "Family",
  rows,
  sourceLabel: "COL26.6 XR",
  pageUrl: "https://www.dashforlife.org/?taxa=fishes",
};

describe("buildBreakdownIssueBody", () => {
  it("states the current breakdown as a table the reporter can see is theirs", () => {
    const body = buildBreakdownIssueBody(input);
    expect(body).toContain("| Family | # Described | Assessed | No 1:1 CoL Match | # Not Evaluated |");
    expect(body).toContain("| Syngnathidae | 313 | 286 | 2 | 25 |");
    expect(body).toContain("COL26.6 XR");
  });

  it("leaves a 'we believe it should be' section for them to fill in", () => {
    const body = buildBreakdownIssueBody(input);
    expect(body).toContain("### Currently");
    expect(body).toContain("### We believe it should be");
    expect(body.indexOf("### Currently")).toBeLessThan(body.indexOf("### We believe it should be"));
  });

  it("records the page the report came from, so the view can be reproduced", () => {
    expect(buildBreakdownIssueBody(input)).toContain("https://www.dashforlife.org/?taxa=fishes");
  });

  it("omits the provenance footer when there's no page URL (SSR, no window)", () => {
    expect(buildBreakdownIssueBody({ ...input, pageUrl: undefined })).not.toContain("Reported from");
  });

  // A few hundred rows would produce a URL GitHub refuses; say so rather than
  // hand back a link that fails on click.
  it("truncates a very long breakdown and says how much it kept", () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ name: `Fam${i}`, count: i, trueAssessed: i, noMatch: 0, neCount: 0 }));
    const body = buildBreakdownIssueBody({ ...input, rows: many });
    expect(body).toContain("_First 40 of 120 rows shown._");
    expect(body).toContain("| Fam39 |");
    expect(body).not.toContain("| Fam40 |");
  });
});

describe("buildBreakdownIssueUrl", () => {
  it("points at the repo's new-issue form with the title and body prefilled", () => {
    const url = new URL(buildBreakdownIssueUrl(input));
    expect(url.origin + url.pathname).toBe(`${GITHUB_REPO_URL}/issues/new`);
    expect(url.searchParams.get("title")).toBe("Described-species breakdown for Seahorses & Pipefishes looks wrong");
    expect(url.searchParams.get("body")).toContain("| Syngnathidae | 313 | 286 | 2 | 25 |");
  });

  // The ampersand in "Seahorses & Pipefishes" is exactly the character that
  // would truncate the body if it were concatenated rather than encoded.
  it("encodes the query so a group name containing & survives the round trip", () => {
    const url = buildBreakdownIssueUrl(input);
    expect(url).not.toContain("Seahorses & Pipefishes");
    expect(new URL(url).searchParams.get("title")).toContain("Seahorses & Pipefishes");
  });
});
