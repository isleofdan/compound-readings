import type { ReactNode } from "react";

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-full border px-3 py-1 text-sm ${active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-400 bg-white text-neutral-800"}`}
    >
      {children}
    </button>
  );
}
