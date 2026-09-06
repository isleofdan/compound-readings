import type { Route } from "../router";

// Bottom tab bar (BUILD_PLAN.md 1.5): fixed at the bottom, one-handed reach.
// Two tabs now; the drill and predict tabs drop into TABS next session with no
// layout change — every tab is flex-1 and the bar has no fixed column count.
export type TabKey = Route["tab"];

const TABS: { key: TabKey; label: string; hint: string; route: Route }[] = [
  { key: "chains", label: "鎖", hint: "Chains", route: { tab: "chains", chain: null } },
  { key: "browse", label: "検索", hint: "Browse", route: { tab: "browse", q: "", cls: null, pc: null, open: null } },
];

export function TabBar({ active, onSelect }: { active: TabKey; onSelect: (route: Route) => void }) {
  return (
    <nav aria-label="Modes" className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-300 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(t.route)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center leading-tight ${isActive ? "font-bold text-neutral-900" : "text-neutral-500"}`}
              >
                <span className="text-xl">{t.label}</span>
                <span className="text-[11px]">{t.hint}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
