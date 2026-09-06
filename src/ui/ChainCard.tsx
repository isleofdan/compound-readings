import type { CompactEntry } from "../data/compact";
import { displayReadingTypes } from "../data/index";
import { EXCEPTION_LABEL, PHONETIC_CHANGE_LABELS } from "../data/labels";
import { Badge } from "./Badge";
import { ContestedReadings } from "./ContestedReadings";

// One entry in a chain (ported from the prototype's EntryCard). Before the tap:
// compound, reading, context — the learner proposes the classification first
// (Session 3 brief §5 rule 2). After the tap: classification, per-character
// reading types, phonetic change, alternates, trap note, contested note. The
// context field stays visible on every card (CLAUDE.md §3.4).

function CharBoxes({ e }: { e: CompactEntry }) {
  const d = displayReadingTypes(e);
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {d.chars.map((c, i) => (
        <div key={i} className="min-w-16 rounded-lg bg-neutral-100 px-3 py-2 text-center">
          <div className="text-2xl">{c.k}</div>
          {c.r !== null && <div className="text-neutral-800">{c.r}</div>}
          {!d.wholeWord && (
            <div className={`text-xs font-bold ${c.t === "on" ? "text-emerald-800" : c.t === "kun" ? "text-amber-900" : "text-neutral-500"}`}>{c.label}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ChainCard({ e, revealed, exception, onReveal }: { e: CompactEntry; revealed: boolean; exception: boolean; onReveal: () => void }) {
  const d = displayReadingTypes(e);
  return (
    <li className={`rounded-2xl border bg-white p-4 shadow-sm ${exception && revealed ? "border-red-700" : "border-neutral-300"}`}>
      <div className="text-center">
        <div className="text-4xl font-bold tracking-widest">{e.compound}</div>
        <div className="mt-1 text-xl text-neutral-700">{e.reading}</div>
      </div>
      <p className="mt-2 text-sm text-neutral-700">
        <span className="font-semibold text-neutral-900">Context:</span> {e.context}
      </p>

      {!revealed && (
        <button
          type="button"
          onClick={onReveal}
          className="mt-3 min-h-11 w-full rounded-xl border border-neutral-400 bg-neutral-50 text-base font-semibold text-neutral-900"
        >
          Reveal
        </button>
      )}

      {revealed && (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge cls={e.cls} />
            {exception && <span className="rounded-full bg-red-700 px-2.5 py-0.5 text-sm font-semibold text-white">{EXCEPTION_LABEL}</span>}
            {e.tags.includes("unclassifiable") && <span className="rounded bg-red-700 px-1.5 py-0.5 text-xs font-bold text-white">unclassifiable</span>}
          </div>
          {d.wholeWord && (
            <p className="text-center text-neutral-700">
              熟字訓 — the reading <span className="font-semibold text-neutral-900">{e.reading}</span> attaches to the whole word{d.hasSplit ? "; the split below is how the source records it" : ""}.
            </p>
          )}
          <CharBoxes e={e} />
          {e.changes.length > 0 && (
            <p className="text-center italic text-neutral-700">
              {e.changes.map((p) => PHONETIC_CHANGE_LABELS[p]).join(", ")}
              {e.changeDetail && <> — {e.changeDetail}</>}
            </p>
          )}
          <ContestedReadings e={e} />
          {e.trap && (
            <p className="rounded border-l-4 border-yellow-600 bg-yellow-50 px-2 py-1">
              <span className="font-semibold">Trap:</span> {e.trap}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
