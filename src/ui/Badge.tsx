import { CLASSIFICATION_LABELS } from "../data/labels";
import type { Classification } from "../data/schema";

// One color per classification; the Japanese label comes from labels.ts.
const CLS_STYLE: Record<Classification, string> = {
  on_on: "bg-emerald-700 text-white",
  kun_kun: "bg-amber-800 text-white",
  juubako: "bg-indigo-700 text-white",
  yutou: "bg-fuchsia-800 text-white",
  jukujikun: "bg-yellow-700 text-white",
};

export function Badge({ cls, small = false }: { cls: Classification; small?: boolean }) {
  return (
    <span className={`inline-block rounded-full font-semibold ${CLS_STYLE[cls]} ${small ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-sm"}`}>
      {CLASSIFICATION_LABELS[cls]}
    </span>
  );
}
