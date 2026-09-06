// Loads the app-facing dataset. The app imports ONLY the generated compact
// file (DATA_SPEC.md §1, §4.4); the canonical file never reaches the bundle.
import compact from "../../data/generated/compounds.compact.json";
import type { CompactEntry, CompactFile } from "./compact";
import { CLASSIFICATION_ORDER } from "./labels";
import type { Classification } from "./schema";

const file = compact as CompactFile;

export const ENTRIES: CompactEntry[] = file.entries;

export type ClassificationCounts = Record<Classification, number>;

export function classificationCounts(entries: CompactEntry[] = ENTRIES): ClassificationCounts {
  const counts = Object.fromEntries(CLASSIFICATION_ORDER.map((c) => [c, 0])) as ClassificationCounts;
  for (const e of entries) counts[e.cls]++;
  return counts;
}

/** "重箱 is N of M entries; …" — computed, never typed (CLAUDE.md §5, §7). */
export function imbalanceSentence(entries: CompactEntry[] = ENTRIES): string {
  const n = entries.filter((e) => e.cls === "juubako").length;
  return `重箱 is ${n} of ${entries.length} entries; this reflects how the dataset was built, not Japanese frequency.`;
}

/** Search: an entry matches when any character of the query appears in its compound. */
export function matchesSearch(entry: CompactEntry, query: string): boolean {
  const q = [...query.trim()];
  if (q.length === 0) return true;
  return q.some((ch) => entry.compound.includes(ch));
}
