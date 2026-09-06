import { describe, expect, it } from "vitest";
import { ENTRIES } from "../../data/index";
import { DRILL_LABELS } from "../../data/labels";
import { predictPool } from "../../data/select";
import { NO_FILTERS } from "../../router";
import { acceptedReadings, grade, toHiragana } from "./grade";

const byCompound = (w: string) => ENTRIES.find((e) => e.compound === w)!;
const g = (w: string, typed: string) => grade(byCompound(w), typed);

describe("kana normalization", () => {
  it("katakana and spaces normalize to hiragana", () => {
    expect(toHiragana("テスウ")).toBe("てすう");
    expect(toHiragana(" ば しょ ")).toBe("ばしょ");
    expect(toHiragana("がっこう")).toBe("がっこう");
  });
});

describe("grading (Session 4 brief §5 rule 4)", () => {
  it("手数: てすう correct; てかず → classification; しゅすう → classification", () => {
    expect(g("手数", "てすう").outcome).toBe("correct");
    const tekazu = g("手数", "てかず");
    expect(tekazu.outcome).toBe("miss");
    expect(tekazu.cause).toBe("classification");
    expect(tekazu.lines).toEqual(["数 = かず は訓読み — ここでは音（すう）"]);
    const shusuu = g("手数", "しゅすう");
    expect(shusuu.outcome).toBe("miss");
    expect(shusuu.cause).toBe("classification");
    expect(shusuu.lines).toEqual(["手 = しゅ は音読み — ここでは訓（て）"]);
  });

  it("手数: てす → inventory (right type, the other on reading of 数)", () => {
    const r = g("手数", "てす");
    expect(r.outcome).toBe("miss");
    expect(r.cause).toBe("inventory");
    expect(r.lines).toEqual(["数 は音で合っているが、す ではなく すう（音: スウ・ス）"]);
  });

  it("場所: ばしょ correct; じょうしょ → classification", () => {
    expect(g("場所", "ばしょ").outcome).toBe("correct");
    const r = g("場所", "じょうしょ");
    expect(r.outcome).toBe("miss");
    expect(r.cause).toBe("classification");
    expect(r.lines).toEqual(["場 = じょう は音読み — ここでは訓（ば）"]);
  });

  it("茶畑: ちゃばたけ correct; ちゃはたけ → phonetic (連濁)", () => {
    expect(g("茶畑", "ちゃばたけ").outcome).toBe("correct");
    const r = g("茶畑", "ちゃはたけ");
    expect(r.outcome).toBe("miss");
    expect(r.cause).toBe("phonetic");
    expect(r.chars[1].change).toBe("rendaku");
    expect(r.lines).toEqual(["畑: はたけ → ばたけ（連濁）"]);
  });

  it("学校: がっこう correct; がくこう → phonetic (促音)", () => {
    expect(g("学校", "がっこう").outcome).toBe("correct");
    const r = g("学校", "がくこう");
    expect(r.outcome).toBe("miss");
    expect(r.cause).toBe("phonetic");
    expect(r.chars[0].change).toBe("sokuon");
    expect(r.lines).toEqual(["学: がく → がっ（促音）"]);
  });

  it("施行: しこう / せこう / せぎょう all correct with their statuses", () => {
    const primary = g("施行", "しこう");
    expect(primary.outcome).toBe("correct");
    expect(primary.matched?.status).toBe("primary");
    const sekou = g("施行", "せこう");
    expect(sekou.outcome).toBe("correct_variant");
    expect(sekou.matched?.status).toBe("variant_spreading");
    expect(sekou.label).toBe(DRILL_LABELS.correctVariant);
    expect(sekou.lines).toEqual(["せこう（変種・広まりつつある）"]);
    const segyou = g("施行", "せぎょう");
    expect(segyou.outcome).toBe("correct_variant");
    expect(segyou.matched?.status).toBe("standard");
    expect(acceptedReadings(byCompound("施行")).map((a) => a.reading)).toEqual(["しこう", "せこう", "せぎょう"]);
  });

  it("代替: だいがえ is correct, variant — never 'wrong, the prescriptive form is だいたい'", () => {
    const r = g("代替", "だいがえ");
    expect(r.outcome).toBe("correct_variant");
    expect(r.matched?.status).toBe("variant_spreading");
    expect(r.lines.join(" ")).not.toContain("だいたい");
  });

  it("大人: おとな correct; だいじん → whole-word miss, no cause analysis", () => {
    expect(g("大人", "おとな").outcome).toBe("correct");
    const r = g("大人", "だいじん");
    expect(r.outcome).toBe("miss_wholeword");
    expect(r.cause).toBeNull();
    expect(r.chars).toEqual([]);
    expect(r.lines).toEqual(["熟字訓 — 「おとな」は語全体の読みで、字ごとに分解できない"]);
  });

  it("katakana input is accepted", () => {
    expect(g("場所", "バショ").outcome).toBe("correct");
  });

  it("no segmentation → 部分一致なし, and the right reading is stated", () => {
    const r = g("場所", "x");
    expect(r.outcome).toBe("no_match");
    expect(r.lines).toEqual(["部分一致なし — 正解は ばしょ"]);
    expect(g("場所", "").outcome).toBe("no_match");
  });

  it("over-applied voicing is a phonetic miss the other way", () => {
    const r = g("手数", "てずう");
    expect(r.outcome).toBe("miss");
    expect(r.cause).toBe("phonetic");
    expect(r.lines).toEqual(["数 = すう のまま — ずう は連濁をかけすぎ"]);
  });

  it("two misses: classification outranks phonetic", () => {
    const r = g("茶畑", "さはたけ"); // 茶 = さ is the other on reading (inventory); 畑 unvoiced (phonetic)
    expect(r.outcome).toBe("miss");
    expect(r.cause).toBe("inventory");
    expect(r.chars.map((c) => c.cause)).toEqual(["inventory", "phonetic"]);
  });

  it("the primary reading of every predictable entry grades correct, and nothing throws on a nonsense reading", () => {
    for (const e of predictPool(NO_FILTERS)) {
      expect(grade(e, e.reading).outcome, e.compound).toBe("correct");
      for (const a of e.alternates) if (a.status !== "nonstandard") expect(grade(e, a.reading).outcome, `${e.compound} ${a.reading}`).toBe("correct_variant");
      expect(() => grade(e, "ぬぬぬ")).not.toThrow();
      expect(() => grade(e, "")).not.toThrow();
    }
  });

  it("every entry, including the unclassifiable and three-character ones, grades without throwing", () => {
    for (const e of ENTRIES) {
      expect(() => grade(e, e.reading)).not.toThrow();
      expect(() => grade(e, "がっこう")).not.toThrow();
    }
  });
});
