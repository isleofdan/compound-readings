import type { ReactNode } from "react";

/** A bar fixed just above the tab bar — where a thumb reaches (BUILD_PLAN.md 1.5). */
export function FixedBottom({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur" style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-md px-3 py-2">{children}</div>
    </div>
  );
}
