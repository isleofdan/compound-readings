import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ENTRIES } from "../data/index";
import { ALTERNATE_STATUS_LABELS } from "../data/labels";
import { ContestedReadings } from "./ContestedReadings";

const byCompound = (w: string) => ENTRIES.find((e) => e.compound === w)!;
const render = (w: string) => renderToStaticMarkup(<ContestedReadings e={byCompound(w)} />);

describe("ContestedReadings", () => {
  it("施行: every alternate with its status label, source status and the contested note; nothing marked correct", () => {
    const html = render("施行");
    expect(html).toContain("せこう");
    expect(html).toContain("せぎょう");
    expect(html).toContain(ALTERNATE_STATUS_LABELS.variant_spreading);
    expect(html).toContain(ALTERNATE_STATUS_LABELS.standard);
    expect(html).toContain("variant — widespread but prescriptively contested");
    expect(html).toContain("Contested:");
    expect(html.toLowerCase()).not.toMatch(/correct|answer|wrong/);
  });

  it("代替: the spreading variant and its classification change", () => {
    const html = render("代替");
    expect(html).toContain("だいがえ");
    expect(html).toContain("重箱");
    expect(html).toContain(ALTERNATE_STATUS_LABELS.variant_spreading);
    expect(html).toContain("Contested:");
  });

  it("毎月: a standard alternate that changes the classification, with no contested note", () => {
    const html = render("毎月");
    expect(html).toContain("まいげつ");
    expect(html).toContain("音音");
    expect(html).toContain(ALTERNATE_STATUS_LABELS.standard);
    expect(html).not.toContain("Contested:");
  });

  it("明日: both alternates, one 熟字訓 and one 音音", () => {
    const html = render("明日");
    expect(html).toContain("あす");
    expect(html).toContain("みょうにち");
    expect((html.match(/source: standard/g) ?? []).length).toBe(2);
  });

  it("renders nothing for an entry with no alternates and no contested flag", () => {
    expect(render("手紙")).toBe("");
  });
});
