import { describe, expect, it } from "vitest";
import { ENTRIES } from "../../data/index";
import { CLASSIFICATION_ORDER } from "../../data/labels";
import { differentiatingLines, impliedTypes, mechanismLine } from "./explain";

const byCompound = (w: string) => ENTRIES.find((e) => e.compound === w)!;

describe("classification drill explanations", () => {
  it("implied types per classification", () => {
    expect(impliedTypes("on_on", 2)).toEqual(["on", "on"]);
    expect(impliedTypes("kun_kun", 2)).toEqual(["kun", "kun"]);
    expect(impliedTypes("juubako", 2)).toEqual(["on", "kun"]);
    expect(impliedTypes("yutou", 3)).toEqual(["kun", "on", "on"]);
    expect(impliedTypes("jukujikun", 2)).toBeNull();
  });

  it("a right answer has no differentiating line; the mechanism is stated", () => {
    expect(differentiatingLines(byCompound("場所"), "yutou")).toEqual([]);
    expect(mechanismLine(byCompound("場所"))).toBe("場 = ば（訓）+ 所 = しょ（音）→ 湯桶");
    expect(mechanismLine(byCompound("大人"))).toContain("語全体の読み");
  });

  it("場所 answered 音音: the line names 場 = ば as kun here, not on", () => {
    const lines = differentiatingLines(byCompound("場所"), "on_on");
    expect(lines).toEqual(["場 = ば はここでは訓、音ではない"]);
  });

  it("茶畑 answered 湯桶: both characters are named", () => {
    expect(differentiatingLines(byCompound("茶畑"), "yutou")).toEqual(["茶 = ちゃ はここでは音、訓ではない", "畑 = ばたけ はここでは訓、音ではない"]);
  });

  it("熟字訓 either way", () => {
    expect(differentiatingLines(byCompound("大人"), "on_on")[0]).toContain("音音ではなく熟字訓");
    expect(differentiatingLines(byCompound("場所"), "jukujikun")[0]).toBe("熟字訓ではなく湯桶 — 字ごとに読める: 場 = ば（訓）+ 所 = しょ（音）");
  });

  it("never throws, for every entry and every answer", () => {
    for (const e of ENTRIES) {
      expect(() => mechanismLine(e)).not.toThrow();
      for (const c of CLASSIFICATION_ORDER) {
        const lines = differentiatingLines(e, c);
        if (c !== e.cls) expect(lines.length).toBeGreaterThan(0);
      }
    }
  });
});
