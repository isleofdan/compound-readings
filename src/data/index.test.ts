import { describe, expect, it } from "vitest";
import {
  ALL_CHAINS,
  BY_CHARACTER,
  BY_CLASSIFICATION,
  BY_DIFFICULTY,
  BY_PHONETIC_CHANGE,
  CHAIN_BY_CHARACTER,
  ENTRIES,
  LESSON_CHAINS,
  displayReadingTypes,
  entriesWithCharacter,
  isException,
  isLesson,
  lessonChain,
} from "./index";

const byCompound = (w: string) => ENTRIES.find((e) => e.compound === w)!;

describe("chain index", () => {
  it("resolves the 手 chain to its entries in entry_order with 手段 last and marked as the exception", () => {
    const te = CHAIN_BY_CHARACTER.get("手")!;
    expect(te.entries.map((e) => e.compound)).toEqual(["手紙", "手間", "切手", "新手", "手本", "手帳", "手数", "手配", "手段"]);
    expect(te.entries[te.entries.length - 1].compound).toBe("手段");
    expect(te.exceptions.map((e) => e.compound)).toEqual(["手段"]);
    expect(isException(te, byCompound("手段"))).toBe(true);
    expect(isException(te, byCompound("手紙"))).toBe(false);
    expect(te.reliability).toBe("clean");
  });

  it("目 is not a lesson (no entries); 夕 and 毎 are lessons; 場 is a lesson with usually", () => {
    const me = CHAIN_BY_CHARACTER.get("目")!;
    expect(me.entries).toEqual([]);
    expect(isLesson(me)).toBe(false);
    expect(lessonChain("目")).toBeUndefined();
    expect(isLesson(CHAIN_BY_CHARACTER.get("夕")!)).toBe(true);
    expect(isLesson(CHAIN_BY_CHARACTER.get("毎")!)).toBe(true);
    const ba = CHAIN_BY_CHARACTER.get("場")!;
    expect(isLesson(ba)).toBe(true);
    expect(ba.reliability).toBe("usually");
    expect(ba.entries[ba.entries.length - 1].compound).toBe("場所");
  });

  it("offers exactly 手, 場, 夕, 毎 as lesson chains, in that order", () => {
    expect(LESSON_CHAINS.map((c) => c.character)).toEqual(["手", "場", "夕", "毎"]);
  });

  it("a rule_reliability none chain with many entries is not a lesson", () => {
    const mono = CHAIN_BY_CHARACTER.get("物")!;
    expect(mono.entries.length).toBeGreaterThanOrEqual(3);
    expect(isLesson(mono)).toBe(false);
  });

  it("carries every row of chains.json and every entry_order id resolves", () => {
    expect(ALL_CHAINS.length).toBe(30);
    for (const c of ALL_CHAINS) expect(c.entries.every((e) => e.compound.includes(c.character))).toBe(true);
  });
});

describe("character and filter indices", () => {
  it("every one of the 168 entries appears under at least one character", () => {
    expect(ENTRIES.length).toBe(168);
    const seen = new Set<string>();
    for (const list of BY_CHARACTER.values()) for (const e of list) seen.add(e.id);
    expect(seen.size).toBe(ENTRIES.length);
    expect(entriesWithCharacter("場").map((e) => e.compound)).toContain("場所");
    expect(entriesWithCharacter("峠").map((e) => e.compound)).toEqual(["峠"]);
    expect(entriesWithCharacter("ゆ")).toEqual([]);
  });

  it("classification, difficulty and phonetic-change indices partition or cover the dataset", () => {
    expect(Object.values(BY_CLASSIFICATION).reduce((n, xs) => n + xs.length, 0)).toBe(ENTRIES.length);
    expect(Object.values(BY_DIFFICULTY).reduce((n, xs) => n + xs.length, 0)).toBe(ENTRIES.length);
    expect(BY_PHONETIC_CHANGE.handakuon.map((e) => e.compound).sort()).toEqual(["乾杯", "年俸", "心配", "散歩"].sort());
    expect(BY_CLASSIFICATION.yutou.map((e) => e.compound)).toContain("場所");
  });
});

describe("displayReadingTypes", () => {
  it("does not throw on 峠 (one kanji), 朝寝坊 (three kanji) or 大人 (熟字訓 with a split)", () => {
    for (const w of ["峠", "朝寝坊", "大人"]) expect(() => displayReadingTypes(byCompound(w))).not.toThrow();
    expect(displayReadingTypes(byCompound("峠")).chars.length).toBe(1);
    expect(displayReadingTypes(byCompound("朝寝坊")).chars.map((c) => c.label)).toEqual(["訓", "訓", "音"]);
  });

  it("marks 熟字訓 as whole-word and preserves the source's split when present", () => {
    const otona = displayReadingTypes(byCompound("大人"));
    expect(otona.wholeWord).toBe(true);
    expect(otona.hasSplit).toBe(true);
    expect(otona.chars.map((c) => c.label)).toEqual(["—", "—"]);
    const basho = displayReadingTypes(byCompound("場所"));
    expect(basho.wholeWord).toBe(false);
    expect(basho.chars.map((c) => `${c.k}${c.r}${c.label}`)).toEqual(["場ば訓", "所しょ音"]);
  });

  it("handles a 熟字訓 with no per-character reading without throwing", () => {
    const fake = { ...byCompound("大人"), chars: byCompound("大人").chars.map((c) => ({ ...c, r: null })) };
    const d = displayReadingTypes(fake);
    expect(d.wholeWord).toBe(true);
    expect(d.hasSplit).toBe(false);
  });
});
