import { useState } from "react";
import { CLASSIFICATION_LABELS, CLASSIFICATION_ORDER, DRILL_LABELS, PHONETIC_CHANGE_LABELS, PHONETIC_CHANGE_ORDER, UI_LABELS } from "../data/labels";
import { DIFFICULTY_LEVELS } from "../data/index";
import type { DifficultyLevel, DrillFilters } from "../router";
import { Chip } from "./Chip";

// The optional filter chips both drills share (Session 4 brief §5 rule 5):
// classification, difficulty, phonetic change, each backed by the entry
// fields the data-layer indices use. The pool count is always visible; the
// chips fold away behind 絞り込み so the card and the answer buttons keep the
// screen on a phone. The filters live in the URL, not here.

export function FilterChips({ filters, poolSize, onChange }: { filters: DrillFilters; poolSize: number; onChange: (patch: Partial<DrillFilters>) => void }) {
  const active = filters.cls !== null || filters.diff !== null || filters.pc !== null;
  const [open, setOpen] = useState(active);
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`min-h-9 rounded-full border px-3 ${active ? "border-neutral-900 font-semibold" : "border-neutral-400"}`}
        >
          {DRILL_LABELS.filter} {open ? "▴" : "▾"}
        </button>
        <span className="text-neutral-700">{UI_LABELS.entries(poolSize)}</span>
      </div>
      {open && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {CLASSIFICATION_ORDER.map((c) => (
              <Chip key={c} active={filters.cls === c} onClick={() => onChange({ cls: filters.cls === c ? null : c })}>
                {CLASSIFICATION_LABELS[c]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTY_LEVELS.map((d: DifficultyLevel) => (
              <Chip key={d} active={filters.diff === d} onClick={() => onChange({ diff: filters.diff === d ? null : d })}>
                {UI_LABELS.difficulty}
                {d}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PHONETIC_CHANGE_ORDER.map((p) => (
              <Chip key={p} active={filters.pc === p} onClick={() => onChange({ pc: filters.pc === p ? null : p })}>
                {PHONETIC_CHANGE_LABELS[p]}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
