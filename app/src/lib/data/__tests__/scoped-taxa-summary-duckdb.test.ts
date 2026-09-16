import { describe, it, expect } from "vitest";
import { countryWhere, countriesWhere, systemsWhere, scopeWhere, outdatedSql, claimEligibleSiblingsSql } from "@/lib/data/scoped-taxa-summary-duckdb";
import type { TaxonomyNode } from "@/config/taxonomy-tree";

// Unit tests for the pure SQL-fragment builders in scoped-taxa-summary-duckdb.ts.
// The live DuckDB queries themselves (getScopedTaxaSummary/getScopedChildrenSummaries)
// are verified manually against real data — cross-checked via curl against
// /api/redlist/taxa-summary?country=FR/BR and independently-run raw DuckDB queries,
// including a live claim-tracking case (Indonesia's ssc-fish-groups children summing
// to exactly the ground-truth fish total for that country) — same reasoning
// species-duckdb.test.ts gives for not exercising real parquet reads in CI.

describe("countryWhere", () => {
  it("uppercases the country code", () => {
    expect(countryWhere("fr")).toContain("'FR'");
  });

  it("escapes embedded single quotes", () => {
    expect(countryWhere("o'brien")).toContain("'O''BRIEN'");
  });

  it("checks exact list membership, not substring match", () => {
    const sql = countryWhere("FR");
    expect(sql).toContain("list_contains(string_split(coalesce(countries, ''), ';'), 'FR')");
  });
});

describe("countriesWhere", () => {
  it("matches countryWhere exactly for a single code", () => {
    expect(countriesWhere(["FR"])).toBe(countryWhere("FR"));
  });

  it("ORs multiple codes together — a species matching any one of them counts once, not per-code", () => {
    const sql = countriesWhere(["FR", "DE", "IT"]);
    expect(sql).toBe(`${countryWhere("FR")} OR ${countryWhere("DE")} OR ${countryWhere("IT")}`);
  });

  it("returns a predicate that matches nothing for an empty list", () => {
    expect(countriesWhere([])).toBe("FALSE");
  });
});

describe("outdatedSql", () => {
  it("treats a null assessment_date as outdated", () => {
    expect(outdatedSql("2016-01-01")).toContain("assessment_date IS NULL");
  });

  it("compares against the cutoff date as a DATE, not a TIMESTAMP", () => {
    const sql = outdatedSql("2016-01-01");
    expect(sql).toContain("CAST(assessment_date AS DATE) <= CAST('2016-01-01' AS DATE)");
  });
});

describe("claimEligibleSiblingsSql", () => {
  const node = (id: string, filter: TaxonomyNode["filter"]): TaxonomyNode => ({ id, name: id, filter });

  it("returns null when no sibling is claim-eligible", () => {
    const children = [
      node("a", { taxonGroups: ["fishes"], families: ["labridae"] }),
      node("catchall", { taxonGroups: ["fishes"], excludeClasses: ["chondrichthyes"] }),
    ];
    expect(claimEligibleSiblingsSql(children, 1)).toBeNull();
  });

  it("includes siblings scoped by classNames or orderNames", () => {
    const children = [
      node("primates", { taxonGroups: ["mammals"], orderNames: ["primates"] }),
      node("rodents", { taxonGroups: ["mammals"], classNames: ["mammalia"] }),
      node("catchall", { taxonGroups: ["mammals"], excludeClasses: [] }),
    ];
    const sql = claimEligibleSiblingsSql(children, 2);
    expect(sql).toContain("primates");
    expect(sql).toMatch(/\) OR \(/); // joins multiple siblings with OR
  });

  it("excludes families/genera/speciesNames-scoped siblings from claim eligibility", () => {
    const children = [
      node("pinnipeds", { taxonGroups: ["mammals"], families: ["otariidae"] }),
      node("catchall", { taxonGroups: ["mammals"], excludeClasses: [] }),
    ];
    expect(claimEligibleSiblingsSql(children, 1)).toBeNull();
  });

  it("excludes the node at excludeIdx itself even if it would otherwise be claim-eligible", () => {
    const children = [
      node("primates", { taxonGroups: ["mammals"], orderNames: ["primates"] }),
      node("rodents", { taxonGroups: ["mammals"], orderNames: ["rodentia"] }),
    ];
    const sql = claimEligibleSiblingsSql(children, 0);
    expect(sql).not.toContain("primates");
    expect(sql).toContain("rodentia");
  });
});

describe("systemsWhere", () => {
  it("checks exact list membership of the systems column", () => {
    expect(systemsWhere(["Marine"])).toBe(
      "list_contains(string_split(coalesce(systems, ''), ';'), 'Marine')"
    );
  });

  it("ORs multiple realms together — a Freshwater;Marine species counts once, not twice", () => {
    const sql = systemsWhere(["Freshwater", "Marine"]);
    expect(sql).toBe(`${systemsWhere(["Freshwater"])} OR ${systemsWhere(["Marine"])}`);
  });

  it("returns a predicate that matches nothing for an empty list", () => {
    expect(systemsWhere([])).toBe("FALSE");
  });

  // Realm is a closed set of three known values, unlike country codes — an
  // unrecognized one is dropped rather than escaped into the query, so it can
  // never reach DuckDB as a literal at all.
  it("drops unrecognized realms instead of quoting them into the SQL", () => {
    expect(systemsWhere(["Marine", "Lunar"])).toBe(systemsWhere(["Marine"]));
    expect(systemsWhere(["'; DROP TABLE x --"])).toBe("FALSE");
  });

  it("is case-sensitive — the data spells realms exactly as the Red List does", () => {
    expect(systemsWhere(["marine"])).toBe("FALSE");
  });
});

describe("scopeWhere", () => {
  it("returns null when neither dimension is scoped, signalling 'use the precomputed global artifacts'", () => {
    expect(scopeWhere([], [])).toBeNull();
  });

  it("returns just the country clause when only countries are scoped", () => {
    expect(scopeWhere(["FR"], [])).toBe(`(${countriesWhere(["FR"])})`);
  });

  it("returns just the realm clause when only realms are scoped", () => {
    expect(scopeWhere([], ["Marine"])).toBe(`(${systemsWhere(["Marine"])})`);
  });

  // AND, not OR: marine species IN Indonesia, not marine species plus Indonesian ones.
  it("ANDs the two dimensions so they intersect rather than union", () => {
    expect(scopeWhere(["ID"], ["Marine"])).toBe(
      `(${countriesWhere(["ID"])}) AND (${systemsWhere(["Marine"])})`
    );
  });

  // Each dimension stays internally OR'd inside its own parens — without them the
  // AND would bind to the last country only (a OR b AND c), silently narrowing.
  it("parenthesizes each dimension's own OR list before ANDing them", () => {
    const sql = scopeWhere(["FR", "DE"], ["Marine", "Freshwater"])!;
    expect(sql.startsWith("(")).toBe(true);
    expect(sql).toContain(") AND (");
  });
});
