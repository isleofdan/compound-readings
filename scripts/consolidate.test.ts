import { describe, expect, it } from "vitest";
import { consolidate, migrationReport } from "./consolidate";
import { DatasetSchema } from "../src/data/schema";

describe("consolidate", () => {
  const a = consolidate();
  const b = consolidate();

  it("is deterministic: two runs produce identical dataset and report", () => {
    expect(JSON.stringify(a.entries)).toBe(JSON.stringify(b.entries));
    expect(migrationReport(a)).toBe(migrationReport(b));
  });

  it("keeps every source entry (168 in, 168 out) and conforms to the schema", () => {
    const sourceTotal = a.batches.reduce((s, x) => s + x.entries.length, 0);
    expect(a.entries.length).toBe(sourceTotal);
    expect(DatasetSchema.safeParse({ $schema_version: "1.0.0", entries: a.entries }).success).toBe(true);
  });

  it("drops no source field", () => {
    expect(a.unexpectedEntryFields.size).toBe(0);
    expect(a.unexpectedCharFields.size).toBe(0);
    expect(a.unexpectedAltFields.size).toBe(0);
  });

  it("promotes exactly 散歩, 年俸, 心配, 乾杯 to handakuon", () => {
    const h = a.entries.filter((e) => e.phonetic_changes.includes("handakuon")).map((e) => e.compound).sort();
    expect(h).toEqual(["乾杯", "年俸", "心配", "散歩"].sort());
    expect(a.entries.some((e) => e.phonetic_changes.includes("other"))).toBe(false);
  });

  it("marks the eight §7.4 compounds contested with a note", () => {
    const c = a.entries.filter((e) => e.contested);
    expect(c.map((e) => e.compound).sort()).toEqual(["貼付", "施行", "代替", "重複", "依存", "続柄", "遊説", "一段落"].sort());
    for (const e of c) expect(e.contested_note).toBeTruthy();
  });

  it("applies every named fix", () => {
    const by = new Map(a.entries.map((e) => [e.compound, e]));
    expect(by.get("革靴")!.characters[1].reading_type).toBe("kun");
    expect(by.get("初耳")!.characters[0].reading_type).toBe("kun");
    expect(by.get("音読み")!.trap_note).not.toMatch(/wait/);
    expect(by.get("音読み")!.trap_note).toMatch(/訓読み is also 重箱読み/);
  });

  it("keeps 峠 and sets has_kana on the eleven kana compounds", () => {
    const by = new Map(a.entries.map((e) => [e.compound, e]));
    expect(by.get("峠")!.char_count).toBe(1);
    expect(by.get("峠")!.tags).toEqual(["kokuji", "unclassifiable"]);
    expect(a.entries.filter((e) => e.has_kana).length).toBe(11);
  });
});

describe("prototype merge", () => {
  const c = consolidate();
  it("extracts 43 prototype entries, matches 40, leaves 3 unmatched and uninserted", () => {
    expect(c.prototype.entries.length).toBe(43);
    expect(c.prototype.matched.length).toBe(40);
    expect(c.prototype.unmatched.map((p) => p.compound).sort()).toEqual(["会議", "毎日", "若葉"].sort());
    expect(c.entries.length).toBe(168);
  });
  it("retains the source on every disagreement (場所 stays 湯桶 with 場 kun)", () => {
    const basho = c.entries.find((e) => e.compound === "場所")!;
    expect(basho.classification).toBe("yutou");
    expect(basho.characters[0].reading_type).toBe("kun");
    expect(c.prototype.disagreements.length).toBe(28);
  });
});
