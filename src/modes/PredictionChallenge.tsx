import { DRILL_LABELS } from "../data/labels";
import type { Navigate, PredictRoute } from "../router";

// Prediction Challenge (BUILD_PLAN.md 1.4) — placeholder; the port lands in a later step.
export function PredictionChallenge({ route }: { route: PredictRoute; navigate: Navigate }) {
  return (
    <div className="px-3 pt-4 text-neutral-900">
      <h1 className="text-xl font-bold">{DRILL_LABELS.predictTitle}</h1>
      <p className="mt-2 text-sm text-neutral-700">{JSON.stringify({ cls: route.cls, diff: route.diff, pc: route.pc })}</p>
    </div>
  );
}
