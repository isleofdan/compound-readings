import type { CompactEntry } from "../data/compact";
import { UI_LABELS } from "../data/labels";
import { EntryReveal } from "./EntryReveal";

// One entry in a chain (ported from the prototype's EntryCard). Before the tap:
// compound, reading, context — the learner proposes the classification first
// (Session 3 brief §5 rule 2). After the tap: the shared EntryReveal —
// classification, per-character reading types, phonetic change, alternates,
// trap note, contested note. The context field stays visible on every card
// (CLAUDE.md §3.4).

export function ChainCard({ e, revealed, exception, onReveal }: { e: CompactEntry; revealed: boolean; exception: boolean; onReveal: () => void }) {
  return (
    <li className={`rounded-2xl border bg-white p-4 shadow-sm ${exception && revealed ? "border-red-700" : "border-neutral-300"}`}>
      <div className="text-center">
        <div className="text-4xl font-bold tracking-widest">{e.compound}</div>
        <div className="mt-1 text-xl text-neutral-700">{e.reading}</div>
      </div>
      <p className="mt-2 text-sm text-neutral-700">
        <span className="font-semibold text-neutral-900">{UI_LABELS.context}:</span> {e.context}
      </p>

      {!revealed && (
        <button
          type="button"
          onClick={onReveal}
          className="mt-3 min-h-11 w-full rounded-xl border border-neutral-400 bg-neutral-50 text-base font-semibold text-neutral-900"
        >
          {UI_LABELS.reveal}
        </button>
      )}

      {revealed && (
        <div className="mt-3">
          <EntryReveal e={e} exception={exception} />
        </div>
      )}
    </li>
  );
}
