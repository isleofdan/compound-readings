// Why a classification answer was right or wrong (Session 4 brief §5 rule 2;
// CLAUDE.md §3.2). A correct answer gets the mechanism stated; a wrong one
// gets the same plus the one line per character that separates the learner's
// answer from the right one, e.g. 「場 = ば はここでは訓、音ではない」.
import type { CompactEntry } from "../../data/compact";
import { CLASSIFICATION_LABELS, READING_TYPE_LABELS } from "../../data/labels";
import type { Classification, ReadingType } from "../../data/schema";

/** The per-character reading types a classification implies for n characters (null for 熟字訓). */
export function impliedTypes(cls: Classification, n: number): ReadingType[] | null {
  if (cls === "jukujikun") return null;
  const first: ReadingType = cls === "on_on" || cls === "juubako" ? "on" : "kun";
  const rest: ReadingType = cls === "on_on" || cls === "yutou" ? "on" : "kun";
  return Array.from({ length: n }, (_, i) => (i === 0 ? first : rest));
}

/** "場 = ば（訓）+ 所 = しょ（音）→ 湯桶", or the whole-word statement for 熟字訓. */
export function mechanismLine(e: CompactEntry): string {
  if (e.cls === "jukujikun") return `熟字訓 — 「${e.reading}」は語全体の読みで、字ごとには分けられない`;
  const parts = e.chars.map((c) => `${c.k} = ${c.r ?? "—"}（${READING_TYPE_LABELS[c.t]}）`);
  return `${parts.join("+ ")}→ ${CLASSIFICATION_LABELS[e.cls]}`;
}

/**
 * The lines that separate a wrong answer from the right one. Empty when the
 * answer is right. Never throws on 熟字訓, one- or three-character entries.
 */
export function differentiatingLines(e: CompactEntry, chosen: Classification): string[] {
  if (chosen === e.cls) return [];
  const right = CLASSIFICATION_LABELS[e.cls];
  const wrong = CLASSIFICATION_LABELS[chosen];
  if (e.cls === "jukujikun") return [`${wrong}ではなく${right} — 「${e.reading}」は語全体の読みで、字ごとに分けられない`];
  if (chosen === "jukujikun") {
    const parts = e.chars.map((c) => `${c.k} = ${c.r ?? "—"}（${READING_TYPE_LABELS[c.t]}）`);
    return [`${wrong}ではなく${right} — 字ごとに読める: ${parts.join("+ ")}`];
  }
  const implied = impliedTypes(chosen, e.chars.length) ?? [];
  const lines = e.chars.flatMap((c, i) => {
    const want = implied[i];
    if (!want || c.t === want || c.t === "neither") return [];
    return [`${c.k} = ${c.r ?? "—"} はここでは${READING_TYPE_LABELS[c.t]}、${READING_TYPE_LABELS[want]}ではない`];
  });
  return lines.length > 0 ? lines : [`${wrong}ではなく${right}`];
}
