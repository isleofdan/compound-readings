import { useMemo } from "react";
import type { CompactEntry } from "../data/compact";
import { ENTRIES, classificationCounts, imbalanceSentence, matchesSearch } from "../data/index";
import { CLASSIFICATION_LABELS, CLASSIFICATION_ORDER, PHONETIC_CHANGE_LABELS, PHONETIC_CHANGE_ORDER, READING_TYPE_LABELS, UI_LABELS } from "../data/labels";
import type { Classification, PhoneticChange } from "../data/schema";
import type { BrowseRoute, Navigate } from "../router";
import { Badge } from "../ui/Badge";
import { Chip } from "../ui/Chip";
import { ContestedReadings } from "../ui/ContestedReadings";

// Browse — the Phase 0 data-inspection page (Session 2), unchanged in behavior:
// search by character, five classification chips and six phonetic-change
// chips, tap-to-expand entries, the entry count and the imbalance sentence. Its
// state now lives in the URL (#/browse?q=…&cls=…&pc=…&open=…) so a reload lands
// on the same search; nothing is stored on the device.

function EntryRow({ e, open, onToggle }: { e: CompactEntry; open: boolean; onToggle: () => void }) {
  const unclassifiable = e.tags.includes("unclassifiable");
  return (
    <li className="border-b border-neutral-200">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-1 py-3 text-left">
        <span className="text-2xl font-bold tracking-wider">{e.compound}</span>
        <span className="text-base text-neutral-700">{e.reading}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {unclassifiable && <span className="rounded bg-red-700 px-1.5 py-0.5 text-xs font-bold text-white">unclassifiable</span>}
          <Badge cls={e.cls} />
        </span>
      </button>
      {open && (
        <div className="space-y-3 px-1 pb-4 text-sm">
          {unclassifiable && (
            <p className="rounded border-2 border-red-700 bg-red-50 px-2 py-1 font-semibold text-red-900">
              Tagged unclassifiable — classification is the closest fit, for Dan to rule on.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {e.chars.map((c, i) => (
              <div key={i} className="min-w-20 rounded-lg bg-neutral-100 px-3 py-2 text-center">
                <div className="text-xl">{c.k}</div>
                <div className="text-neutral-800">{c.r ?? "—"}</div>
                <div className={`text-xs font-bold ${c.t === "on" ? "text-emerald-800" : c.t === "kun" ? "text-amber-900" : "text-neutral-500"}`}>{READING_TYPE_LABELS[c.t]}</div>
                <div className="mt-1 text-xs text-neutral-600">音 {c.on.join("・") || "—"}</div>
                <div className="text-xs text-neutral-600">訓 {c.kun.join("・") || "—"}</div>
              </div>
            ))}
          </div>
          {e.chars.some((c) => c.note) && (
            <ul className="list-disc space-y-1 pl-5 text-neutral-800">
              {e.chars.filter((c) => c.note).map((c, i) => (
                <li key={i}>
                  <span className="font-semibold">{c.k}</span> {c.note}
                </li>
              ))}
            </ul>
          )}
          <p>
            <span className="font-semibold">{UI_LABELS.phoneticChanges}:</span> {e.changes.length ? e.changes.map((p) => PHONETIC_CHANGE_LABELS[p]).join(", ") : UI_LABELS.none}
            {e.changeDetail && <span className="text-neutral-700"> — {e.changeDetail}</span>}
          </p>
          <ContestedReadings e={e} />
          <p>
            <span className="font-semibold">{UI_LABELS.context}:</span> {e.context}
          </p>
          {e.trap && (
            <p className="rounded border-l-4 border-yellow-600 bg-yellow-50 px-2 py-1">
              <span className="font-semibold">{UI_LABELS.trap}:</span> {e.trap}
            </p>
          )}
          <p className="text-neutral-700">
            <span className="font-semibold text-neutral-900">{UI_LABELS.tags}:</span> {e.tags.length ? e.tags.join(", ") : UI_LABELS.none} ·{" "}
            <span className="font-semibold text-neutral-900">{UI_LABELS.chains}:</span> {e.chains.length ? e.chains.join(" ") : UI_LABELS.none} ·{" "}
            <span className="font-semibold text-neutral-900">{UI_LABELS.difficulty}:</span> {e.diff} · <span className="text-neutral-500">{e.id}</span>
          </p>
        </div>
      )}
    </li>
  );
}

export function Browse({ route, navigate }: { route: BrowseRoute; navigate: Navigate }) {
  const { q: query, cls, pc: change, open: openId } = route;
  const set = (patch: Partial<BrowseRoute>) => navigate({ ...route, ...patch }, { replace: true });

  const counts = useMemo(() => classificationCounts(), []);
  const visible = useMemo(
    () => ENTRIES.filter((e) => matchesSearch(e, query) && (cls === null || e.cls === cls) && (change === null || e.changes.includes(change))),
    [query, cls, change],
  );

  return (
    <div className="px-3 text-neutral-900">
      <header className="pt-4">
        <h1 className="text-xl font-bold">複合語の読み — Browse</h1>
        <p className="mt-1 text-sm">
          <span className="font-semibold">{UI_LABELS.entries(ENTRIES.length)}</span> ·{" "}
          {CLASSIFICATION_ORDER.map((c) => `${CLASSIFICATION_LABELS[c]} ${counts[c]}`).join(" · ")}
        </p>
        <p className="mt-1 text-sm text-neutral-700">{imbalanceSentence()}</p>
      </header>

      <div className="sticky top-0 z-10 -mx-3 bg-white px-3 py-2 shadow-sm">
        <label className="block">
          <span className="sr-only">Search by character</span>
          <input
            type="search"
            inputMode="text"
            value={query}
            onChange={(ev) => set({ q: ev.target.value })}
            placeholder="Type a kanji, e.g. 場"
            className="min-h-11 w-full rounded-lg border border-neutral-400 px-3 text-lg"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CLASSIFICATION_ORDER.map((c: Classification) => (
            <Chip key={c} active={cls === c} onClick={() => set({ cls: cls === c ? null : c })}>
              {CLASSIFICATION_LABELS[c]}
            </Chip>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PHONETIC_CHANGE_ORDER.map((p: PhoneticChange) => (
            <Chip key={p} active={change === p} onClick={() => set({ pc: change === p ? null : p })}>
              {PHONETIC_CHANGE_LABELS[p]}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-neutral-600">
          {UI_LABELS.shown(visible.length, ENTRIES.length)}
        </p>
      </div>

      <ul>
        {visible.map((e) => (
          <EntryRow key={e.id} e={e} open={openId === e.id} onToggle={() => set({ open: openId === e.id ? null : e.id })} />
        ))}
      </ul>
      {visible.length === 0 && <p className="py-6 text-center text-neutral-600">No entry matches.</p>}
    </div>
  );
}
