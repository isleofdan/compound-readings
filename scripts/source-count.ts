// Counts the entries in the four source batch files. This is the ONE place the
// source-entry count is computed. The hello page shows it (injected at build time
// by vite.config.ts) and the Vitest test checks it, so the two cannot drift apart.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SOURCE_DIR = join(process.cwd(), "data", "source");

export const SOURCE_FILES = [
  "compound_readings_data.json",
  "compound_readings_batch2.json",
  "compound_readings_batch3.json",
  "compound_readings_batch4.json",
] as const;

export function readSourceEntries(file: string): unknown[] {
  const text = readFileSync(join(SOURCE_DIR, file), "utf8");
  const parsed = JSON.parse(text) as { entries?: unknown };
  if (!Array.isArray(parsed.entries)) {
    throw new Error(`${file}: expected a top-level "entries" array`);
  }
  return parsed.entries;
}

export function countSourceEntries(): number {
  return SOURCE_FILES.reduce((sum, file) => sum + readSourceEntries(file).length, 0);
}
