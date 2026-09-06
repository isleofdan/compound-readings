import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEX_PATH, buildIndex } from "./build-index";

describe("regenerated index", () => {
  it("is deterministic and the committed reports/03-index.md is current", () => {
    const a = buildIndex();
    expect(buildIndex()).toBe(a);
    expect(readFileSync(INDEX_PATH, "utf8")).toBe(a);
  });
});
