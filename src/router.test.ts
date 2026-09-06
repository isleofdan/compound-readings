import { describe, expect, it } from "vitest";
import { parseHash, toHash } from "./router";

describe("hash router", () => {
  it("parses the chain routes", () => {
    expect(parseHash("#/chains")).toEqual({ tab: "chains", chain: null });
    expect(parseHash("#/chains/手")).toEqual({ tab: "chains", chain: "手" });
    expect(parseHash("#/chains/%E5%A0%B4")).toEqual({ tab: "chains", chain: "場" });
    expect(parseHash("")).toEqual({ tab: "chains", chain: null });
    expect(parseHash("#/nonsense/x")).toEqual({ tab: "chains", chain: null });
  });

  it("parses the browse routes and drops invalid filter values", () => {
    expect(parseHash("#/browse")).toEqual({ tab: "browse", q: "", cls: null, pc: null, open: null });
    expect(parseHash("#/browse?q=場")).toEqual({ tab: "browse", q: "場", cls: null, pc: null, open: null });
    expect(parseHash("#/browse?q=%E6%89%8B&cls=yutou&pc=rendaku&open=cr_0027")).toEqual({ tab: "browse", q: "手", cls: "yutou", pc: "rendaku", open: "cr_0027" });
    expect(parseHash("#/browse?cls=bogus&pc=bogus")).toEqual({ tab: "browse", q: "", cls: null, pc: null, open: null });
  });

  it("round-trips every route through toHash", () => {
    for (const h of ["#/chains", "#/chains/%E5%A0%B4", "#/browse", "#/browse?q=%E5%A0%B4", "#/browse?q=%E6%89%8B&cls=yutou&pc=rendaku&open=cr_0027"]) {
      expect(toHash(parseHash(h))).toBe(h);
    }
    expect(toHash({ tab: "chains", chain: "手" })).toBe("#/chains/%E6%89%8B");
  });
});
