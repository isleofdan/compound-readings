import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { CompactEntry } from "../data/compact";
import { entryById } from "../data/index";
import { CLASSIFICATION_LABELS, CLASSIFICATION_ORDER, DRILL_LABELS, UI_LABELS } from "../data/labels";
import type { Classification } from "../data/schema";
import { advance, currentId, drillPool, newQueue, type Queue } from "../data/select";
import { filterKey, type DrillFilters, type DrillRoute, type Navigate } from "../router";
import { EntryReveal } from "../ui/EntryReveal";
import { FilterChips } from "../ui/FilterChips";
import { FixedBottom } from "../ui/FixedBottom";
import { differentiatingLines, mechanismLine } from "./drill/explain";

// Classification Drill (BUILD_PLAN.md 1.3), ported from the prototype's
// ClassificationDrill: a card with compound, reading and context; five answer
// buttons at the bottom; on answer, the reveal explains why (the mechanism,
// and on a miss the line that separates the answer from the right one), then
// the full entry reveal; a "next" control. The tally is in memory for this
// page load only — counts, no percentage, no history (brief §5 rule 6). The
// pool and its order come from src/data/select.ts.

export type DrillState = { queue: Queue | null; chosen: Classification | null; tally: { correct: number; wrong: number } };
export const EMPTY_DRILL_STATE: DrillState = { queue: null, chosen: null, tally: { correct: 0, wrong: 0 } };

const STRUCTURE_HINT: Record<Classification, string> = { on_on: "音+音", kun_kun: "訓+訓", juubako: "音+訓", yutou: "訓+音", jukujikun: "語全体" };

export function routeFilters(route: DrillFilters): DrillFilters {
  return { cls: route.cls, diff: route.diff, pc: route.pc };
}

export function DrillCard({ e, showReading }: { e: CompactEntry; showReading: boolean }) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-4 shadow-sm" data-compound={e.compound}>
      <div className="text-center">
        <div className="text-4xl font-bold tracking-widest">{e.compound}</div>
        {showReading && <div className="mt-1 text-xl text-neutral-700">{e.reading}</div>}
      </div>
      <p className="mt-2 text-sm text-neutral-700">
        <span className="font-semibold text-neutral-900">{UI_LABELS.context}:</span> {e.context}
      </p>
    </div>
  );
}

export function DrillOutcome({ e, chosen }: { e: CompactEntry; chosen: Classification }) {
  const correct = chosen === e.cls;
  const lines = differentiatingLines(e, chosen);
  return (
    <div
      data-outcome={correct ? "correct" : "wrong"}
      className={`mt-3 rounded-xl border px-3 py-2 text-sm ${correct ? "border-emerald-700 bg-emerald-50" : "border-red-700 bg-red-50"}`}
    >
      <div className={`text-lg font-bold ${correct ? "text-emerald-800" : "text-red-800"}`}>{correct ? DRILL_LABELS.correct : DRILL_LABELS.wrong}</div>
      {!correct && (
        <div className="mt-0.5 text-neutral-800">
          {CLASSIFICATION_LABELS[chosen]} → <span className="font-semibold">{CLASSIFICATION_LABELS[e.cls]}</span>
        </div>
      )}
      {lines.map((l, i) => (
        <div key={i} className="mt-1 font-semibold text-neutral-900">
          {l}
        </div>
      ))}
      <div className="mt-1 text-neutral-800">{mechanismLine(e)}</div>
    </div>
  );
}

export function Tally({ parts }: { parts: [string, number][] }) {
  const shown = parts.filter(([, n]) => n > 0);
  if (shown.length === 0) return null;
  return (
    <p className="text-xs text-neutral-600">
      {DRILL_LABELS.tally} {shown.map(([label, n]) => `${label} ${n}`).join(" · ")}
    </p>
  );
}

export function ClassificationDrill({ route, navigate, state, setState }: { route: DrillRoute; navigate: Navigate; state: DrillState; setState: Dispatch<SetStateAction<DrillState>> }) {
  const filters = routeFilters(route);
  const key = filterKey(filters);
  const pool = useMemo(() => drillPool(filters), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const queue = state.queue && state.queue.key === key ? state.queue : null;

  useEffect(() => {
    if (queue === null && pool.length > 0) setState((s) => ({ ...s, queue: newQueue(pool, key), chosen: null }));
  }, [queue, pool, key, setState]);

  const entry = queue ? entryById(currentId(queue) ?? "") : undefined;
  const setFilters = (patch: Partial<DrillFilters>) => navigate({ ...route, ...patch }, { replace: true });

  const answer = (cls: Classification) => {
    if (!entry) return;
    const correct = cls === entry.cls;
    setState((s) => ({ ...s, chosen: cls, tally: { correct: s.tally.correct + (correct ? 1 : 0), wrong: s.tally.wrong + (correct ? 0 : 1) } }));
  };
  const next = () => setState((s) => ({ ...s, chosen: null, queue: s.queue ? advance(s.queue) : null }));
  const reset = () => setState({ ...EMPTY_DRILL_STATE, queue: pool.length > 0 ? newQueue(pool, key) : null });

  return (
    <div className="px-3 pb-28 pt-4 text-neutral-900">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{DRILL_LABELS.drillTitle}</h1>
          <Tally parts={[[DRILL_LABELS.correct, state.tally.correct], [DRILL_LABELS.wrong, state.tally.wrong]]} />
        </div>
        <button type="button" onClick={reset} className="min-h-9 rounded-full border border-neutral-400 px-3 text-sm">
          {DRILL_LABELS.reset}
        </button>
      </header>
      <FilterChips filters={filters} poolSize={pool.length} onChange={setFilters} />

      {pool.length === 0 && <p className="mt-6 text-center text-neutral-600">この絞り込みに当てはまる語はありません。</p>}

      {entry && (
        <div className="mt-4">
          <DrillCard e={entry} showReading />
          {state.chosen !== null && (
            <>
              <DrillOutcome e={entry} chosen={state.chosen} />
              <div className="mt-3 rounded-2xl border border-neutral-300 bg-white p-4 shadow-sm">
                <EntryReveal e={entry} />
              </div>
            </>
          )}
        </div>
      )}

      {entry && (
        <FixedBottom>
          {state.chosen === null ? (
            <div className="grid grid-cols-6 gap-2">
              {CLASSIFICATION_ORDER.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => answer(c)}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-xl border border-neutral-400 bg-white leading-tight ${i < 3 ? "col-span-2" : "col-span-3"}`}
                >
                  <span className="text-lg font-bold">{CLASSIFICATION_LABELS[c]}</span>
                  <span className="text-[11px] text-neutral-600">{STRUCTURE_HINT[c]}</span>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={next} className="min-h-12 w-full rounded-xl bg-neutral-900 text-lg font-bold text-white">
              {DRILL_LABELS.next}
            </button>
          )}
        </FixedBottom>
      )}
    </div>
  );
}
