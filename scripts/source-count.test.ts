import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOURCE_DIR, SOURCE_FILES, countSourceEntries } from "./source-count";

describe("source batch files", () => {
  it.each(SOURCE_FILES)("%s parses as JSON with an entries array", (file) => {
    const parsed = JSON.parse(readFileSync(join(SOURCE_DIR, file), "utf8"));
    expect(Array.isArray(parsed.entries)).toBe(true);
    expect(parsed.entries.length).toBeGreaterThan(0);
  });

  it("entry total equals the build-time count shown on the hello page", () => {
    // Independent recount, then compared with the helper the build uses.
    let independentTotal = 0;
    for (const file of SOURCE_FILES) {
      const parsed = JSON.parse(readFileSync(join(SOURCE_DIR, file), "utf8"));
      independentTotal += parsed.entries.length;
    }
    expect(countSourceEntries()).toBe(independentTotal);
  });
});
