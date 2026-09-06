import type { CompactEntry } from "../data/compact";
import { displayReadingTypes } from "../data/index";
import { EXCEPTION_LABEL, PHONETIC_CHANGE_LABELS, READING_TYPE_LABELS, UI_LABELS } from "../data/labels";
import { Badge } from "./Badge";
import { ContestedReadings } from "./ContestedReadings";

// The revealed body of an entry, shared by the chain card and both drills:
// classification, per-character reading types (with the on/kun inventories
// when asked), phonetic change and detail, alternates with status, and the
// trap note. The reveal explains the mechanism; it never just marks.

export function CharBoxes({ e, showInventory = false }: { e: CompactEntry; showInventory?: boolean }) {
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
          {showInventory && (
            <>
              <div className="mt-1 text-xs text-neutral-600">
                {READING_TYPE_LABELS.on} {e.chars[i].on.join("・") || "—"}
              </div>
              <div className="text-xs text-neutral-600">
                {READING_TYPE_LABELS.kun} {e.chars[i].kun.join("・") || "—"}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function EntryReveal({ e, exception = false, showInventory = false }: { e: CompactEntry; exception?: boolean; showInventory?: boolean }) {
  const d = displayReadingTypes(e);
  return (
    <div className="space-y-3 text-sm">
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
      <CharBoxes e={e} showInventory={showInventory} />
      {e.changes.length > 0 && (
        <p className="text-center italic text-neutral-700">
          {e.changes.map((p) => PHONETIC_CHANGE_LABELS[p]).join(", ")}
          {e.changeDetail && <> — {e.changeDetail}</>}
        </p>
      )}
      <ContestedReadings e={e} />
      {e.trap && (
        <p className="rounded border-l-4 border-yellow-600 bg-yellow-50 px-2 py-1">
          <span className="font-semibold">{UI_LABELS.trap}:</span> {e.trap}
        </p>
      )}
    </div>
  );
}
