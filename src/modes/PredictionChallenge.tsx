import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { CompactEntry } from "../data/compact";
import { displayReadingTypes, entryById } from "../data/index";
import { DRILL_LABELS } from "../data/labels";
import { advance, currentId, newQueue, predictPool, type Queue } from "../data/select";
import { filterKey, type DrillFilters, type Navigate, type PredictRoute } from "../router";
import { Badge } from "../ui/Badge";
import { EntryReveal } from "../ui/EntryReveal";
import { FilterChips } from "../ui/FilterChips";
import { FixedBottom } from "../ui/FixedBottom";
import { DrillCard, Tally, routeFilters } from "./ClassificationDrill";
import { mechanismLine } from "./drill/explain";
import { grade, type GradeResult } from "./predict/grade";

// Prediction Challenge (BUILD_PLAN.md 1.4), ported from the prototype's
// PredictionChallenge with the self-scoring replaced by typed grading: the
// card shows compound, context and the classification hint; the learner
// types the reading in kana; grading accepts every documented alternate that
// is not nonstandard and names the kind of miss (src/modes/predict/grade.ts).
// The reveal shows the accepted readings with their statuses, per-character
// types and inventories, phonetic change, the trap note and, on a miss, the
// cause line. Tally by outcome, in memory only.

export type PredictTallyKey = GradeResult["outcome"] | "classification" | "inventory" | "phonetic";
export type PredictState = { queue: Queue | null; result: GradeResult | null; tally: Partial<Record<PredictTallyKey, number>> };
export const EMPTY_PREDICT_STATE: PredictState = { queue: null, result: null, tally: {} };

function tallyKey(r: GradeResult): PredictTallyKey {
  return r.outcome === "miss" && r.cause ? r.cause : r.outcome;
}

const TALLY_ORDER: [PredictTallyKey, string][] = [
  ["correct", DRILL_LABELS.correct],
  ["correct_variant", DRILL_LABELS.correctVariant],
  ["classification", DRILL_LABELS.missClassification],
  ["inventory", DRILL_LABELS.missInventory],
  ["phonetic", DRILL_LABELS.missPhonetic],
  ["miss_wholeword", DRILL_LABELS.missWholeWord],
  ["no_match", DRILL_LABELS.noPartialMatch],
];

/** The classification hint: the badge and, for decomposable entries, the reading type under each character. */
export function Hint({ e }: { e: CompactEntry }) {
  const d = displayReadingTypes(e);
  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-neutral-700">
        <span>{DRILL_LABELS.hint}:</span>
        <Badge cls={e.cls} />
      </div>
      {d.wholeWord ? (
        <p className="text-sm text-neutral-700">語全体の読み — 字ごとには分けられない</p>
      ) : (
        <div className="flex gap-2">
          {d.chars.map((c, i) => (
            <div key={i} className="min-w-14 rounded-lg bg-neutral-100 px-3 py-1.5 text-center">
              <div className="text-2xl">{c.k}</div>
              <div className={`text-xs font-bold ${c.t === "on" ? "text-emerald-800" : c.t === "kun" ? "text-amber-900" : "text-neutral-500"}`}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PredictOutcome({ e, result }: { e: CompactEntry; result: GradeResult }) {
  const good = result.outcome === "correct" || result.outcome === "correct_variant";
  return (
    <div data-outcome={result.outcome} className={`mt-3 rounded-xl border px-3 py-2 text-sm ${good ? "border-emerald-700 bg-emerald-50" : "border-red-700 bg-red-50"}`}>
      <div className={`text-lg font-bold ${good ? "text-emerald-800" : "text-red-800"}`}>{result.label}</div>
      <div className="mt-0.5 text-neutral-800">
        入力: <span className="font-semibold">{result.typed || "—"}</span>
        {good && result.matched && <>（{result.matched.statusLabel}）</>}
      </div>
      {!good &&
        result.lines.map((l, i) => (
          <div key={i} className="mt-1 font-semibold text-neutral-900">
            {l}
          </div>
        ))}
      <div className="mt-2">
        <div className="text-xs font-semibold text-neutral-700">{DRILL_LABELS.acceptedReadings}</div>
        <ul className="mt-0.5 flex flex-wrap gap-1.5">
          {result.accepted.map((a) => (
            <li key={a.reading} className={`rounded-full border px-2 py-0.5 ${result.matched?.reading === a.reading ? "border-emerald-700 bg-white font-semibold" : "border-neutral-400 bg-white"}`}>
              {a.reading} <span className="text-xs text-neutral-600">{a.statusLabel}</span>
            </li>
          ))}
        </ul>
      </div>
      {result.outcome !== "miss_wholeword" && <div className="mt-2 text-neutral-800">{mechanismLine(e)}</div>}
    </div>
  );
}

export function PredictionChallenge({ route, navigate, state, setState }: { route: PredictRoute; navigate: Navigate; state: PredictState; setState: Dispatch<SetStateAction<PredictState>> }) {
  const filters = routeFilters(route);
  const key = filterKey(filters);
  const pool = useMemo(() => predictPool(filters), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const queue = state.queue && state.queue.key === key ? state.queue : null;
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (queue === null && pool.length > 0) setState((s) => ({ ...s, queue: newQueue(pool, key), result: null }));
  }, [queue, pool, key, setState]);

  const entry = queue ? entryById(currentId(queue) ?? "") : undefined;
  const setFilters = (patch: Partial<DrillFilters>) => navigate({ ...route, ...patch }, { replace: true });

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!entry) return;
    const result = grade(entry, typed);
    const k = tallyKey(result);
    setState((s) => ({ ...s, result, tally: { ...s.tally, [k]: (s.tally[k] ?? 0) + 1 } }));
  };
  const next = () => {
    setTyped("");
    setState((s) => ({ ...s, result: null, queue: s.queue ? advance(s.queue) : null }));
  };
  const reset = () => {
    setTyped("");
    setState({ ...EMPTY_PREDICT_STATE, queue: pool.length > 0 ? newQueue(pool, key) : null });
  };

  return (
    <div className="px-3 pb-28 pt-4 text-neutral-900">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{DRILL_LABELS.predictTitle}</h1>
          <Tally parts={TALLY_ORDER.map(([k, label]) => [label, state.tally[k] ?? 0])} />
        </div>
        <button type="button" onClick={reset} className="min-h-9 shrink-0 whitespace-nowrap rounded-full border border-neutral-400 px-3 text-sm">
          {DRILL_LABELS.reset}
        </button>
      </header>
      <FilterChips filters={filters} poolSize={pool.length} onChange={setFilters} />

      {pool.length === 0 && <p className="mt-6 text-center text-neutral-600">この絞り込みに当てはまる語はありません。</p>}

      {entry && (
        <div className="mt-4">
          <DrillCard e={entry} showReading={state.result !== null} />
          {state.result === null && <Hint e={entry} />}
          {state.result !== null && (
            <>
              <PredictOutcome e={entry} result={state.result} />
              <div className="mt-3 rounded-2xl border border-neutral-300 bg-white p-4 shadow-sm">
                <EntryReveal e={entry} showInventory />
              </div>
            </>
          )}
        </div>
      )}

      {entry && (
        <FixedBottom>
          {state.result === null ? (
            <form onSubmit={submit} className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">{DRILL_LABELS.typeReading}</span>
                <input
                  type="text"
                  lang="ja"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  enterKeyHint="done"
                  value={typed}
                  onChange={(ev) => setTyped(ev.target.value)}
                  placeholder={DRILL_LABELS.typeReading}
                  className="min-h-12 w-full rounded-xl border border-neutral-400 px-3 text-lg"
                />
              </label>
              <button type="submit" disabled={typed.trim().length === 0} className="min-h-12 rounded-xl bg-neutral-900 px-5 text-lg font-bold text-white disabled:bg-neutral-400">
                {DRILL_LABELS.answer}
              </button>
            </form>
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
