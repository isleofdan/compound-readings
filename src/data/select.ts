// Selection logic for the drills (BUILD_PLAN.md 1.1; Session 4 brief §5 rule
// 5). Both drills draw from every entry except those tagged `unclassifiable`;
// Prediction Challenge additionally excludes three-character compounds. Order
// is uniformly random over the pool, reshuffled per session, with no repeat
// until the pool is exhausted — never "representative" by classification,
// because the dataset's distribution is construction history (CLAUDE.md §5).
import type { DrillFilters } from "../router";
import type { CompactEntry } from "./compact";
import { ENTRIES, isUnclassifiable } from "./index";

export function matchesFilters(e: CompactEntry, f: DrillFilters): boolean {
  return (f.cls === null || e.cls === f.cls) && (f.diff === null || e.diff === f.diff) && (f.pc === null || e.changes.includes(f.pc));
}

/** Classification Drill pool: every entry not tagged unclassifiable, narrowed by the filters. */
export function drillPool(f: DrillFilters, entries: readonly CompactEntry[] = ENTRIES): CompactEntry[] {
  return entries.filter((e) => !isUnclassifiable(e) && matchesFilters(e, f));
}

/** Prediction Challenge pool: the drill pool minus compounds of three characters (the prototype never handled them). */
export function predictPool(f: DrillFilters, entries: readonly CompactEntry[] = ENTRIES): CompactEntry[] {
  return drillPool(f, entries).filter((e) => e.chars.length <= 2);
}

export type Rng = () => number;

/** Fisher–Yates, as in the prototype; `rng` is injectable for tests. */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A pass through a pool: a random permutation of its ids and a cursor. When
 * the cursor runs off the end, `advance` starts a fresh permutation whose
 * first item differs from the one just shown (when the pool allows it).
 */
export type Queue = { key: string; order: string[]; idx: number };

export function newQueue(pool: readonly CompactEntry[], key: string, rng: Rng = Math.random): Queue {
  return { key, order: shuffle(pool.map((e) => e.id), rng), idx: 0 };
}

export function currentId(q: Queue): string | null {
  return q.order[q.idx] ?? null;
}

export function advance(q: Queue, rng: Rng = Math.random): Queue {
  if (q.idx + 1 < q.order.length) return { ...q, idx: q.idx + 1 };
  const last = q.order[q.idx];
  let order = shuffle(q.order, rng);
  if (order.length > 1 && order[0] === last) order = [...order.slice(1), order[0]];
  return { key: q.key, order, idx: 0 };
}
