import type { ChainsRoute, Navigate } from "../router";

// Placeholder for the Chain Explorer mode (BUILD_PLAN.md 1.2), filled in by the
// next step of Session 3. The route already resolves so the shell is complete.
export function ChainExplorer({ route }: { route: ChainsRoute; navigate: Navigate }) {
  return (
    <div className="px-3 pt-4 text-neutral-900">
      <h1 className="text-xl font-bold">鎖 — Chain Explorer</h1>
      <p className="mt-2 text-sm text-neutral-700">{route.chain ? `Chain ${route.chain}` : "Chain list"} — coming in the next step.</p>
    </div>
  );
}
