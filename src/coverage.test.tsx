import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BY_CHARACTER, ENTRIES, LESSON_CHAINS, isUnclassifiable } from "./data/index";
import { CLASSIFICATION_ORDER } from "./data/labels";
import { drillPool, predictPool } from "./data/select";
import { DrillOutcome } from "./modes/ClassificationDrill";
import { Hint, PredictOutcome } from "./modes/PredictionChallenge";
import { grade } from "./modes/predict/grade";
import { NO_FILTERS } from "./router";
import { EntryReveal } from "./ui/EntryReveal";

// Phase 1 definition of done (BUILD_PLAN.md; Session 4 brief §7 step 5):
// every entry reachable in at least one mode, no mode throws on the edge
// entries, 380 px without horizontal scroll (checked by scripts/screenshots.mjs).

const byCompound = (w: string) => ENTRIES.find((e) => e.compound === w)!;

describe("every entry is reachable in at least one mode", () => {
  const chainIds = new Set(LESSON_CHAINS.flatMap((c) => c.entries.map((e) => e.id)));
  const drillIds = new Set(drillPool(NO_FILTERS).map((e) => e.id));
  const predictIds = new Set(predictPool(NO_FILTERS).map((e) => e.id));
  const browseIds = new Set([...BY_CHARACTER.values()].flat().map((e) => e.id));

  it("chains ∪ drill ∪ predict ∪ Browse covers all 168", () => {
    const all = new Set([...chainIds, ...drillIds, ...predictIds, ...browseIds]);
    expect(all.size).toBe(ENTRIES.length);
    expect(ENTRIES.length).toBe(168);
  });

  it("the entries reachable only via Browse are exactly the unclassifiable ones outside every lesson chain", () => {
    const browseOnly = ENTRIES.filter((e) => !chainIds.has(e.id) && !drillIds.has(e.id) && !predictIds.has(e.id));
    expect(browseOnly.every(isUnclassifiable)).toBe(true);
    expect(browseOnly.map((e) => e.compound).sort()).toEqual(ENTRIES.filter((e) => isUnclassifiable(e) && !chainIds.has(e.id)).map((e) => e.compound).sort());
    expect(browseIds.size).toBe(ENTRIES.length);
  });
});

describe("no mode throws on the edge entries", () => {
  const edge = [
    ...ENTRIES.filter((e) => e.cls === "jukujikun"),
    byCompound("峠"),
    byCompound("朝寝坊"),
    byCompound("一段落"),
    ...ENTRIES.filter((e) => e.trap === null),
    ...ENTRIES.filter((e) => e.changeDetail === null).slice(0, 10),
  ];

  it("the entry reveal, both drill reveals and the hint render for each", () => {
    expect(ENTRIES.some((e) => e.trap === null)).toBe(true);
    for (const e of edge) {
      expect(() => renderToStaticMarkup(<EntryReveal e={e} showInventory />), e.compound).not.toThrow();
      expect(() => renderToStaticMarkup(<Hint e={e} />), e.compound).not.toThrow();
      for (const c of CLASSIFICATION_ORDER) expect(() => renderToStaticMarkup(<DrillOutcome e={e} chosen={c} />), `${e.compound} ${c}`).not.toThrow();
      for (const typed of [e.reading, "がっこう", "", "x"]) {
        expect(() => renderToStaticMarkup(<PredictOutcome e={e} result={grade(e, typed)} />), `${e.compound} ${typed}`).not.toThrow();
      }
    }
  });
});
