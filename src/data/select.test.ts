import { describe, expect, it } from "vitest";
import { ENTRIES, isUnclassifiable } from "./index";
import { advance, currentId, drillPool, newQueue, predictPool, shuffle } from "./select";
import { NO_FILTERS } from "../router";

const compounds = (es: { compound: string }[]) => es.map((e) => e.compound);

// A deterministic generator so the no-repeat test is not luck.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("drill pools (Session 4 brief §5 rule 5)", () => {
  it("the drill pool is every entry except the unclassifiable ones", () => {
    const pool = drillPool(NO_FILTERS);
    expect(pool.some(isUnclassifiable)).toBe(false);
    expect(pool.length).toBe(ENTRIES.filter((e) => !isUnclassifiable(e)).length);
    for (const w of ["朝寝坊", "真っ赤", "真っ青", "峠"]) expect(compounds(pool)).not.toContain(w);
    for (const w of ["場所", "大人", "一段落", "施行", "音読み"]) expect(compounds(pool)).toContain(w);
  });

  it("the predict pool also drops three-character compounds", () => {
    const pool = predictPool(NO_FILTERS);
    expect(pool.some((e) => e.chars.length > 2)).toBe(false);
    expect(pool.some(isUnclassifiable)).toBe(false);
    for (const w of ["一段落", "五月雨", "二十歳", "朝寝坊", "峠"]) expect(compounds(pool)).not.toContain(w);
    for (const w of ["場所", "大人", "施行", "茶畑", "学校", "手数"]) expect(compounds(pool)).toContain(w);
    expect(pool.length).toBe(drillPool(NO_FILTERS).filter((e) => e.chars.length <= 2).length);
  });

  it("filters narrow by classification, difficulty and phonetic change using the entry fields", () => {
    expect(drillPool({ cls: "yutou", diff: null, pc: null }).every((e) => e.cls === "yutou")).toBe(true);
    expect(drillPool({ cls: null, diff: 3, pc: null }).every((e) => e.diff === 3)).toBe(true);
    const h = drillPool({ cls: null, diff: null, pc: "handakuon" });
    expect(compounds(h).sort()).toEqual(["乾杯", "心配", "散歩", "年俸"].sort());
    expect(drillPool({ cls: "juubako", diff: null, pc: "rendaku" }).every((e) => e.cls === "juubako" && e.changes.includes("rendaku"))).toBe(true);
  });
});

describe("queue: random order, no repeat until the pool is exhausted", () => {
  it("shuffle is a permutation", () => {
    const ids = ENTRIES.map((e) => e.id);
    const s = shuffle(ids, lcg(7));
    expect(s.length).toBe(ids.length);
    expect([...s].sort()).toEqual([...ids].sort());
    expect(s).not.toEqual(ids);
  });

  it("walks every entry once, then starts a new pass without an immediate repeat", () => {
    const pool = drillPool(NO_FILTERS);
    const rng = lcg(42);
    let q = newQueue(pool, "||", rng);
    const seen: string[] = [];
    for (let i = 0; i < pool.length; i++) {
      seen.push(currentId(q)!);
      q = advance(q, rng);
    }
    expect(new Set(seen).size).toBe(pool.length);
    expect([...seen].sort()).toEqual(pool.map((e) => e.id).sort());
    // The pass is over: the queue restarted at index 0 on a new permutation, first item ≠ last shown.
    expect(q.idx).toBe(0);
    expect(currentId(q)).not.toBe(seen[seen.length - 1]);
    const second: string[] = [];
    for (let i = 0; i < pool.length; i++) {
      second.push(currentId(q)!);
      q = advance(q, rng);
    }
    expect(new Set(second).size).toBe(pool.length);
  });

  it("a pool of one entry keeps showing it", () => {
    const pool = drillPool({ cls: null, diff: null, pc: "handakuon" }).slice(0, 1);
    let q = newQueue(pool, "k");
    q = advance(q);
    expect(currentId(q)).toBe(pool[0].id);
  });
});
