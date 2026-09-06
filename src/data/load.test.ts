import { describe, expect, it } from "vitest";
import { ENTRIES, classificationCounts, imbalanceSentence, matchesSearch } from "./load";

describe("app data layer", () => {
  it("loads the generated compact file with every entry", () => {
    expect(ENTRIES.length).toBe(168);
  });
  it("computes classification counts that sum to the total", () => {
    const c = classificationCounts();
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(ENTRIES.length);
  });
  it("computes the imbalance sentence from the data", () => {
    const n = ENTRIES.filter((e) => e.cls === "juubako").length;
    expect(imbalanceSentence()).toBe(`重箱 is ${n} of ${ENTRIES.length} entries; this reflects how the dataset was built, not Japanese frequency.`);
  });
  it("search matches any character of the query", () => {
    const basho = ENTRIES.find((e) => e.compound === "場所")!;
    expect(matchesSearch(basho, "場")).toBe(true);
    expect(matchesSearch(basho, "所")).toBe(true);
    expect(matchesSearch(basho, "手")).toBe(false);
    expect(matchesSearch(basho, "")).toBe(true);
    expect(ENTRIES.filter((e) => matchesSearch(e, "場")).map((e) => e.compound)).toContain("場所");
  });
});
