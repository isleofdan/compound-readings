import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ENTRIES } from "../data/index";
import { DRILL_LABELS } from "../data/labels";
import { Hint, PredictOutcome } from "./PredictionChallenge";
import { grade } from "./predict/grade";

const byCompound = (w: string) => ENTRIES.find((e) => e.compound === w)!;
const render = (w: string, typed: string) => renderToStaticMarkup(<PredictOutcome e={byCompound(w)} result={grade(byCompound(w), typed)} />);

describe("Prediction Challenge reveal", () => {
  it("施行 せこう: correct, variant, with its status — never wrong", () => {
    const html = render("施行", "せこう");
    expect(html).toContain('data-outcome="correct_variant"');
    expect(html).toContain(DRILL_LABELS.correctVariant);
    expect(html).toContain("変種・広まりつつある");
    expect(html).toContain(DRILL_LABELS.acceptedReadings);
    expect(html).toContain("せぎょう");
    expect(html).not.toContain(DRILL_LABELS.wrong);
  });

  it("場所 じょうしょ: the cause line in Japanese", () => {
    const html = render("場所", "じょうしょ");
    expect(html).toContain('data-outcome="miss"');
    expect(html).toContain(DRILL_LABELS.missClassification);
    expect(html).toContain("場 = じょう は音読み — ここでは訓（ば）");
  });

  it("大人 だいじん: whole-word, says why decomposition fails", () => {
    const html = render("大人", "だいじん");
    expect(html).toContain('data-outcome="miss_wholeword"');
    expect(html).toContain("字ごとに分解できない");
  });

  it("the hint shows the classification and per-character types, and the whole-word note for 熟字訓", () => {
    const html = renderToStaticMarkup(<Hint e={byCompound("場所")} />);
    expect(html).toContain("湯桶");
    expect(html).toContain("訓");
    expect(html).not.toContain("ばしょ");
    expect(renderToStaticMarkup(<Hint e={byCompound("大人")} />)).toContain("語全体の読み");
  });
});
