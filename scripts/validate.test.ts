import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Chain, Dataset, Entry } from "../src/data/schema";
import { kunStems, matchesKun, validateDataset, type Anchor } from "./validate";

// A minimal valid dataset built by hand, so each ERROR rule can be broken on purpose.
function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "cr_0001",
    source_id: "on_on_01",
    source_batch: 1,
    compound: "学校",
    reading: "がっこう",
    char_count: 2,
    has_kana: false,
    classification: "on_on",
    decomposable: true,
    characters: [
      { kanji: "学", reading_in_compound: "がっ", reading_type: "on", on_readings: ["ガク"], kun_readings: ["まなぶ"], reading_note: null },
      { kanji: "校", reading_in_compound: "こう", reading_type: "on", on_readings: ["コウ"], kun_readings: [], reading_note: null },
    ],
    alternate_readings: [],
    contested: false,
    contested_note: null,
    phonetic_changes: ["sokuon"],
    phonetic_change_detail: "ガク + コウ → がっこう",
    difficulty: 1,
    difficulty_rationale: "anchor",
    real_world_context: "school",
    trap_note: null,
    chains: [],
    tags: [],
    ...over,
  };
}

// The eight §7.4 compounds must be present and contested, so the fixture carries them.
const CONTESTED: [string, string, string][] = [
  ["貼付", "ちょうふ", "on_on_05"],
  ["施行", "しこう", "on_on_08"],
  ["代替", "だいたい", "on_on_09"],
  ["重複", "ちょうふく", "on_on_25"],
  ["依存", "いそん", "on_on_27"],
  ["続柄", "つづきがら", "on_on_26"],
  ["遊説", "ゆうぜい", "on_on_04"],
  ["一段落", "いちだんらく", "on_on_30"],
];
function contestedEntries(): Entry[] {
  return CONTESTED.map(([compound, reading, source_id], i) => {
    const chars = [...compound];
    return entry({
      id: `cr_${String(i + 10).padStart(4, "0")}`,
      source_id,
      compound,
      reading,
      char_count: chars.length,
      characters: chars.map((k) => ({ kanji: k, reading_in_compound: "x", reading_type: "on" as const, on_readings: ["エックス"], kun_readings: [], reading_note: null })),
      // "x" is not a dictionary reading, but a phonetic change is listed so §7.5 stays quiet.
      phonetic_changes: ["other"],
      phonetic_change_detail: "fixture",
      contested: true,
      contested_note: "fixture",
    });
  });
}

function dataset(extra: Entry[] = [], base: Entry = entry()): Dataset {
  return { $schema_version: "1.0.0", entries: [base, ...contestedEntries(), ...extra] };
}
const CHAINS = { $status: "proposed" as const, chains: [] as Chain[] };
const NO_ANCHORS: Anchor[] = [];

function errorsOf(d: unknown, chains: unknown = CHAINS, anchors: Anchor[] = NO_ANCHORS) {
  return validateDataset(d, chains, anchors).errors.map((e) => e.rule);
}

describe("validator — the valid fixture passes", () => {
  it("has zero ERRORs; its only WARN is the three-character review of 一段落", () => {
    const r = validateDataset(dataset(), CHAINS, NO_ANCHORS);
    expect(r.errors).toEqual([]);
    expect(r.warns.map((w) => w.rule)).toEqual(["§7.2 char_count > 2 (manual review)"]);
  });
});

describe("validator — every ERROR rule fails a deliberately broken fixture", () => {
  it("§7.1 schema: missing required field", () => {
    const d = dataset();
    delete (d.entries[0] as Partial<Entry>).difficulty_rationale;
    expect(errorsOf(d)).toContain("§7.1 schema");
  });
  it("§7.1 schema: reading not hiragana", () => {
    expect(errorsOf(dataset([], entry({ reading: "ガッコウ" })))).toContain("§7.1 schema");
  });
  it("§7.1 schema: on_readings not katakana / kun_readings not hiragana", () => {
    const a = entry();
    a.characters[0].on_readings = ["がく"];
    expect(errorsOf(dataset([], a))).toContain("§7.1 schema");
    const b = entry();
    b.characters[0].kun_readings = ["マナブ"];
    expect(errorsOf(dataset([], b))).toContain("§7.1 schema");
  });
  it("§7.1 schema: difficulty outside 1–4", () => {
    expect(errorsOf(dataset([], entry({ difficulty: 5 })))).toContain("§7.1 schema");
  });
  it("§7.1 schema: classification `irregular`", () => {
    expect(errorsOf(dataset([], entry({ classification: "irregular" as never })))).toContain("§7.1 schema");
  });
  it("§7.1 schema: alternate status outside the enum", () => {
    const e = entry({
      alternate_readings: [{ reading: "がっこう", classification: "on_on", context: "c", status: "variant — free text" as never, source_status: "variant — free text" }],
    });
    expect(errorsOf(dataset([], e))).toContain("§7.1 schema");
  });
  it("§7.1 id unique", () => {
    expect(errorsOf(dataset([entry({ source_id: "on_on_02", compound: "校学", characters: [entry().characters[1], entry().characters[0]] })]))).toContain("§7.1 id unique");
  });
  it("§7.1 source_id + source_batch unique", () => {
    expect(errorsOf(dataset([entry({ id: "cr_0002" })]))).toContain("§7.1 source_id+source_batch unique");
  });
  it("§7.1 characters.length === char_count", () => {
    expect(errorsOf(dataset([], entry({ char_count: 3 })))).toContain("§7.1 characters.length === char_count");
  });
  it("§7.1 char_count equals kanji count (kanji only)", () => {
    const e = entry({ compound: "学校校", char_count: 2 });
    expect(errorsOf(dataset([], e))).toContain("§7.1 char_count equals kanji count");
    // Kana inside the compound is not counted: 真っ赤 has char_count 2.
    const kana = entry({
      compound: "真っ赤",
      reading: "まっか",
      has_kana: true,
      classification: "yutou",
      characters: [
        { kanji: "真", reading_in_compound: "まっ", reading_type: "kun", on_readings: ["シン"], kun_readings: ["ま"], reading_note: null },
        { kanji: "赤", reading_in_compound: "か", reading_type: "on", on_readings: ["セキ", "カ"], kun_readings: ["あか"], reading_note: null },
      ],
    });
    expect(errorsOf(dataset([], kana))).toEqual([]);
  });
  it("§7.1 kanji concatenation equals compound with kana removed", () => {
    const e = entry();
    e.characters[1].kanji = "枚";
    expect(errorsOf(dataset([], e))).toContain("§7.1 kanji concatenation equals compound (kana removed)");
  });
  it("§7.1 has_kana", () => {
    expect(errorsOf(dataset([], entry({ has_kana: true })))).toContain("§7.1 has_kana");
  });
  it("§7.2 classification derivation", () => {
    expect(errorsOf(dataset([], entry({ classification: "juubako" })))).toContain("§7.2 classification derivation");
  });
  it("§7.2 `neither` on a non-熟字訓 entry", () => {
    const e = entry();
    e.characters[0].reading_type = "neither";
    expect(errorsOf(dataset([], e))).toContain("§7.2 `neither` on a non-熟字訓 entry");
  });
  it("§7.4 contested requires contested_note", () => {
    expect(errorsOf(dataset([], entry({ contested: true })))).toContain("§7.4 contested requires contested_note");
  });
  it("§7.4 the eight contested compounds present and contested", () => {
    const d = dataset();
    d.entries = d.entries.filter((e) => e.compound !== "遊説");
    expect(errorsOf(d)).toContain("§7.4 the eight contested compounds present");
    const d2 = dataset();
    d2.entries.find((e) => e.compound === "施行")!.contested = false;
    expect(errorsOf(d2)).toContain("§7.4 the eight contested compounds contested");
  });
  it("§7.8 anchor mismatch fails", () => {
    const anchors: Anchor[] = [{ compound: "学校", reading: "がっこう", classification: "yutou", asserted_in: "test", note: "wrong on purpose" }];
    expect(errorsOf(dataset(), CHAINS, anchors)).toContain("§7.8 anchor");
    const missing: Anchor[] = [{ compound: "目的", reading: "もくてき", classification: "on_on", asserted_in: "test", note: "absent" }];
    expect(errorsOf(dataset(), CHAINS, missing)).toContain("§7.8 anchor");
    const ok: Anchor[] = [{ compound: "学校", reading: "がっこう", classification: "on_on", reading_types: ["on", "on"], phonetic_changes: ["sokuon"], asserted_in: "test", note: "" }];
    expect(errorsOf(dataset(), CHAINS, ok)).toEqual([]);
  });
  it("chains.json that fails its schema is an ERROR", () => {
    expect(errorsOf(dataset(), { $status: "draft", chains: [] })).toContain("§7.6 chains.json schema");
  });
});

describe("validator — WARN rules", () => {
  it("§7.6 clean chain rule contradicted", () => {
    const shudan = entry({
      id: "cr_0002",
      source_id: "on_on_02",
      compound: "手段",
      reading: "しゅだん",
      chains: ["手"],
      phonetic_changes: [],
      phonetic_change_detail: null,
      characters: [
        { kanji: "手", reading_in_compound: "しゅ", reading_type: "on", on_readings: ["シュ"], kun_readings: ["て"], reading_note: null },
        { kanji: "段", reading_in_compound: "だん", reading_type: "on", on_readings: ["ダン"], kun_readings: [], reading_note: null },
      ],
    });
    const chains = {
      $status: "proposed",
      chains: [{ character: "手", display_order: 1, rule: "手 is て", rule_reliability: "clean", teaching_note: null, entry_order: ["cr_0002"] }],
    };
    const r = validateDataset(dataset([shudan]), chains, NO_ANCHORS);
    expect(r.errors).toEqual([]);
    expect(r.warns.map((w) => w.rule)).toContain("§7.6 clean chain rule contradicted — content bug");
  });
});

describe("§7.5 stem rule", () => {
  it("derives 連用形 stems", () => {
    expect(kunStems("けす")).toEqual(["けし"]);
    expect(kunStems("つづく")).toEqual(["つづき"]);
    // A る verb is ambiguous between 一段 (つける → つけ) and 五段 (かえる → かえり); both stems are accepted.
    expect(kunStems("つける")).toContain("つけ");
    expect(kunStems("かえる")).toContain("かえり");
    expect(kunStems("よむ")).toEqual(["よみ"]);
    expect(kunStems("あらた")).toEqual([]);
  });
  it("消印 けし matches けす; 続柄 つづき matches つづく", () => {
    expect(matchesKun("けし", ["きえる", "けす"])).toBe(true);
    expect(matchesKun("つづき", ["つづく", "つづける"])).toBe(true);
  });
  it("勝負 ぶ matches nothing; 新手 あら does not match あらた", () => {
    expect(matchesKun("ぶ", ["まける", "おう", "まかす"])).toBe(false);
    expect(matchesKun("あら", ["あたらしい", "あらた", "にい"])).toBe(false);
  });
  it("on the real dataset the omission check flags 勝負 and 新手 only", () => {
    const d = JSON.parse(readFileSync(join(process.cwd(), "data", "compounds.json"), "utf8"));
    const chains = JSON.parse(readFileSync(join(process.cwd(), "data", "chains.json"), "utf8"));
    const r = validateDataset(d, chains, []);
    const flagged = r.warns.filter((w) => w.rule.startsWith("§7.5 reading matches no dictionary reading")).map((w) => w.entry.split(" ")[1]);
    expect(flagged.sort()).toEqual(["勝負", "新手"].sort());
  });
  it("the committed dataset has zero ERRORs against the committed anchors", () => {
    const d = JSON.parse(readFileSync(join(process.cwd(), "data", "compounds.json"), "utf8"));
    const chains = JSON.parse(readFileSync(join(process.cwd(), "data", "chains.json"), "utf8"));
    const anchors = JSON.parse(readFileSync(join(process.cwd(), "scripts", "anchors.json"), "utf8"));
    expect(validateDataset(d, chains, anchors).errors).toEqual([]);
  });
});
