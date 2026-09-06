import { DRILL_LABELS } from "../data/labels";
import type { DrillRoute, Navigate } from "../router";

// Classification Drill (BUILD_PLAN.md 1.3) — placeholder; the port lands in the next step.
export function ClassificationDrill({ route }: { route: DrillRoute; navigate: Navigate }) {
  return (
    <div className="px-3 pt-4 text-neutral-900">
      <h1 className="text-xl font-bold">{DRILL_LABELS.drillTitle}</h1>
      <p className="mt-2 text-sm text-neutral-700">{JSON.stringify({ cls: route.cls, diff: route.diff, pc: route.pc })}</p>
    </div>
  );
}
