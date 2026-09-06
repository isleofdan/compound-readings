import type { CompactEntry } from "../data/compact";
import { ALTERNATE_STATUS_LABELS } from "../data/labels";
import { Badge } from "./Badge";

// Contested-reading display (BUILD_PLAN.md 1.6; CLAUDE.md §3.3). Shared by the
// chain card reveal and Browse. Every alternate_readings[] row is shown with
// its mapped status label and the source's status text in smaller type, its
// classification, and its context; the contested note follows. No reading —
// primary or alternate — is marked as "the" answer.

export function ContestedReadings({ e }: { e: CompactEntry }) {
  if (e.alternates.length === 0 && !e.contested) return null;
  return (
    <div className="space-y-2 text-sm">
      {e.alternates.length > 0 && (
        <div>
          <div className="font-semibold">Also read</div>
          <ul className="mt-1 space-y-2">
            {e.alternates.map((a, i) => (
              <li key={i} className="rounded-lg bg-neutral-50 px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-lg">{a.reading}</span>
                  <Badge cls={a.cls} small />
                  <span className="rounded border border-neutral-400 px-1.5 py-0.5 text-xs font-semibold text-neutral-800">{ALTERNATE_STATUS_LABELS[a.status]}</span>
                </div>
                <div className="mt-0.5 text-xs text-neutral-600">source: {a.sourceStatus}</div>
                <div className="mt-0.5 text-neutral-800">{a.context}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {e.contested && e.contestedNote && (
        <p className="rounded border-l-4 border-orange-600 bg-orange-50 px-2 py-1">
          <span className="font-semibold">Contested:</span> {e.contestedNote}
        </p>
      )}
    </div>
  );
}
