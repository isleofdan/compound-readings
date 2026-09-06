import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ENTRIES } from "../data/index";
import { DRILL_LABELS } from "../data/labels";
import { DrillOutcome } from "./ClassificationDrill";

const byCompound = (w: string) => ENTRIES.find((e) => e.compound === w)!;

describe("Classification Drill reveal", () => {
  it("a wrong answer on 場所 shows 不正解, the differentiating line and the mechanism", () => {
    const html = renderToStaticMarkup(<DrillOutcome e={byCompound("場所")} chosen="on_on" />);
    expect(html).toContain('data-outcome="wrong"');
    expect(html).toContain(DRILL_LABELS.wrong);
    expect(html).toContain("場 = ば はここでは訓、音ではない");
    expect(html).toContain("場 = ば（訓）+ 所 = しょ（音）→ 湯桶");
  });

  it("a right answer confirms and states the mechanism, with no differentiating line", () => {
    const html = renderToStaticMarkup(<DrillOutcome e={byCompound("茶畑")} chosen="juubako" />);
    expect(html).toContain('data-outcome="correct"');
    expect(html).toContain(DRILL_LABELS.correct);
    expect(html).not.toContain("ではない");
    expect(html).toContain("茶 = ちゃ（音）+ 畑 = ばたけ（訓）→ 重箱");
  });

  it("熟字訓 answered as 訓訓 says why decomposition fails", () => {
    const html = renderToStaticMarkup(<DrillOutcome e={byCompound("大人")} chosen="kun_kun" />);
    expect(html).toContain("訓訓ではなく熟字訓");
    expect(html).toContain("語全体の読み");
  });
});
