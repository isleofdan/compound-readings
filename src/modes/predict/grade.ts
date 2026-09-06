// Grading for Prediction Challenge (Session 4 brief §5 rules 3–4; BUILD_PLAN.md
// "Honest assessment"). A typed reading is accepted if it equals the primary
// reading or any documented alternate whose status is not `nonstandard`
// (DATA_SPEC.md §7.3), and the result says which reading was accepted and its
// status. A miss is then segmented against each character's on/kun
// inventories with the documented phonetic changes applied, so the result can
// say which kind of miss it was:
//   classification — the reading is from the other type's inventory;
//   inventory      — right type, but a different reading of that character;
//   phonetic       — the right reading with the wrong voicing or gemination
//                    (連濁, 促音, 半濁音化), applied or missing.
// The segmentation that matches the most characters wins (exact > phonetic >
// inventory > classification, summed); if no segmentation covers the whole
// typed string, the result is a plain "no partial match". 熟字訓 entries are
// whole-word: correct or not, no cause analysis.
import type { CompactChar, CompactEntry } from "../../data/compact";
import { ALTERNATE_STATUS_LABELS, DRILL_LABELS, PHONETIC_CHANGE_LABELS, READING_TYPE_LABELS } from "../../data/labels";
import type { AlternateStatus, PhoneticChange, ReadingType } from "../../data/schema";

// ---------------------------------------------------------------- kana

/** Katakana → hiragana, whitespace removed, trimmed. */
export function toHiragana(s: string): string {
  return [...s.replace(/[\s　]+/g, "")]
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp >= 0x30a1 && cp <= 0x30f6 ? String.fromCodePoint(cp - 0x60) : ch;
    })
    .join("");
}

const VOICED: Record<string, string> = {
  か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご",
  さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ",
  た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど",
  は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ",
};
const SEMI_VOICED: Record<string, string> = { は: "ぱ", ひ: "ぴ", ふ: "ぷ", へ: "ぺ", ほ: "ぽ" };
const GEMINATES = new Set(["き", "く", "ち", "つ"]);

// DATA_SPEC.md §7.5 stem rule, as in scripts/validate.ts, plus the い-adjective stem.
const U_TO_I: Record<string, string> = { う: "い", く: "き", ぐ: "ぎ", す: "し", つ: "ち", ぬ: "に", ぶ: "び", む: "み", る: "り" };
const I_E_ROW = "いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ";

function stems(kun: string): string[] {
  const out: string[] = [];
  const chars = [...kun];
  if (chars.length < 2) return out;
  const last = chars[chars.length - 1];
  const prev = chars[chars.length - 2];
  const base = chars.slice(0, -1).join("");
  if (last === "る" && I_E_ROW.includes(prev)) out.push(base);
  if (U_TO_I[last]) out.push(base + U_TO_I[last]);
  if (last === "い" && chars.length >= 3) out.push(base);
  return out;
}

// ---------------------------------------------------------------- candidates

type Candidate = { kana: string; type: ReadingType; base: string; change: PhoneticChange | null };

function withChanges(base: string, type: ReadingType): Candidate[] {
  const out: Candidate[] = [{ kana: base, type, base, change: null }];
  const chars = [...base];
  const first = chars[0];
  const last = chars[chars.length - 1];
  if (VOICED[first]) out.push({ kana: VOICED[first] + chars.slice(1).join(""), type, base, change: "rendaku" });
  if (SEMI_VOICED[first]) out.push({ kana: SEMI_VOICED[first] + chars.slice(1).join(""), type, base, change: "handakuon" });
  if (chars.length >= 2 && GEMINATES.has(last)) out.push({ kana: chars.slice(0, -1).join("") + "っ", type, base, change: "sokuon" });
  return out;
}

/** Every reading a character could contribute, from its inventories, with stems and phonetic variants. */
export function candidates(c: CompactChar): Candidate[] {
  const out: Candidate[] = [];
  for (const on of c.on) out.push(...withChanges(toHiragana(on), "on"));
  for (const kun of c.kun) {
    const k = toHiragana(kun);
    out.push(...withChanges(k, "kun"));
    for (const s of stems(k)) out.push(...withChanges(s, "kun"));
  }
  return out;
}

/** The inventory candidate the recorded reading derives from, if any (prefers the recorded type). */
function expectedCandidate(c: CompactChar): Candidate | null {
  if (c.r === null) return null;
  const r = toHiragana(c.r);
  const matches = candidates(c).filter((x) => x.kana === r);
  return matches.find((x) => x.type === c.t) ?? matches[0] ?? null;
}

// ---------------------------------------------------------------- result types

export type MissCause = "classification" | "inventory" | "phonetic";

export type CharAnalysis = {
  k: string;
  expected: string;
  expectedType: ReadingType;
  typed: string;
  ok: boolean;
  cause: MissCause | null;
  /** The type of the inventory reading the typed segment came from. */
  typedType: ReadingType | null;
  /** For a phonetic miss: the change that was missed or applied where the reading has none. */
  change: PhoneticChange | null;
  line: string | null;
};

export type AcceptedReading = { reading: string; status: AlternateStatus | "primary"; statusLabel: string };

export type GradeResult = {
  typed: string;
  /** Every reading the grader accepts for this entry, primary first. */
  accepted: AcceptedReading[];
  outcome: "correct" | "correct_variant" | "miss" | "miss_wholeword" | "no_match";
  /** The reading that was accepted, for the two correct outcomes. */
  matched: AcceptedReading | null;
  cause: MissCause | null;
  chars: CharAnalysis[];
  lines: string[];
  label: string;
};

export function acceptedReadings(e: CompactEntry): AcceptedReading[] {
  const out: AcceptedReading[] = [{ reading: e.reading, status: "primary", statusLabel: DRILL_LABELS.primaryReading }];
  for (const a of e.alternates) {
    if (a.status === "nonstandard") continue;
    if (out.some((x) => x.reading === a.reading)) continue;
    out.push({ reading: a.reading, status: a.status, statusLabel: ALTERNATE_STATUS_LABELS[a.status] });
  }
  return out;
}

export const CAUSE_LABELS: Record<MissCause, string> = {
  classification: DRILL_LABELS.missClassification,
  inventory: DRILL_LABELS.missInventory,
  phonetic: DRILL_LABELS.missPhonetic,
};

// ---------------------------------------------------------------- segmentation

const SCORE = { exact: 4, phonetic: 3, inventory: 2, classification: 1 } as const;

type Step = { c: Candidate | null; kana: string; ok: boolean; cause: MissCause | null; change: PhoneticChange | null };

function classify(c: CompactChar, cand: Candidate, expected: Candidate | null, r: string): Step {
  if (cand.kana === r) return { c: cand, kana: cand.kana, ok: true, cause: null, change: null };
  if (cand.type !== c.t) return { c: cand, kana: cand.kana, ok: false, cause: "classification", change: null };
  if (expected && cand.base === expected.base) {
    // Same inventory reading, different phonetic form: the change that separates them.
    return { c: cand, kana: cand.kana, ok: false, cause: "phonetic", change: cand.change ?? expected.change };
  }
  return { c: cand, kana: cand.kana, ok: false, cause: "inventory", change: null };
}

/** Best full segmentation of `typed` over the characters, or null when none covers it. */
function segment(chars: CompactChar[], typed: string): Step[] | null {
  const n = chars.length;
  const score = (s: Step) => (s.ok ? SCORE.exact : SCORE[s.cause!]);
  const options: Step[][] = chars.map((c) => {
    const r = toHiragana(c.r ?? "");
    const expected = expectedCandidate(c);
    const seen = new Map<string, Step>();
    const consider = (s: Step) => {
      const prev = seen.get(s.kana);
      if (!prev || score(s) > score(prev)) seen.set(s.kana, s);
    };
    if (r) consider({ c: null, kana: r, ok: true, cause: null, change: null });
    for (const cand of candidates(c)) consider(classify(c, cand, expected, r));
    return [...seen.values()];
  });

  // DP over (character index, position in typed): best score to consume the rest.
  const memo = new Map<string, { total: number; steps: Step[] } | null>();
  const solve = (i: number, pos: number): { total: number; steps: Step[] } | null => {
    if (i === n) return pos === typed.length ? { total: 0, steps: [] } : null;
    const key = `${i}:${pos}`;
    if (memo.has(key)) return memo.get(key)!;
    let best: { total: number; steps: Step[] } | null = null;
    for (const s of options[i]) {
      if (!typed.startsWith(s.kana, pos)) continue;
      const rest = solve(i + 1, pos + s.kana.length);
      if (!rest) continue;
      const total = score(s) + rest.total;
      if (!best || total > best.total) best = { total, steps: [s, ...rest.steps] };
    }
    memo.set(key, best);
    return best;
  };
  return solve(0, 0)?.steps ?? null;
}

// ---------------------------------------------------------------- explanation lines

function charLine(c: CompactChar, s: Step): string | null {
  const expected = toHiragana(c.r ?? "");
  const t = READING_TYPE_LABELS[c.t];
  if (s.ok) return null;
  if (s.cause === "classification") {
    const typedType = s.c ? READING_TYPE_LABELS[s.c.type] : "—";
    return `${c.k} = ${s.kana} は${typedType}読み — ここでは${t}（${expected}）`;
  }
  if (s.cause === "phonetic") {
    const change = s.change ? PHONETIC_CHANGE_LABELS[s.change] : DRILL_LABELS.missPhonetic;
    const base = s.c?.base ?? s.kana;
    return base === expected
      ? `${c.k} = ${expected} のまま — ${s.kana} は${change}をかけすぎ`
      : `${c.k}: ${base} → ${expected}（${change}）`;
  }
  const inventory = (c.t === "on" ? c.on : c.kun).join("・");
  return `${c.k} は${t}で合っているが、${s.kana} ではなく ${expected}（${t}: ${inventory || "—"}）`;
}

const CAUSE_PRIORITY: MissCause[] = ["classification", "inventory", "phonetic"];

// ---------------------------------------------------------------- grade

export function grade(e: CompactEntry, input: string): GradeResult {
  const typed = toHiragana(input);
  const accepted = acceptedReadings(e);
  const matched = accepted.find((a) => toHiragana(a.reading) === typed) ?? null;
  const base = { typed, accepted, matched, cause: null, chars: [] as CharAnalysis[] };

  if (matched) {
    const variant = matched.status !== "primary";
    return {
      ...base,
      outcome: variant ? "correct_variant" : "correct",
      lines: variant ? [`${matched.reading}（${matched.statusLabel}）`] : [],
      label: variant ? DRILL_LABELS.correctVariant : DRILL_LABELS.correct,
    };
  }

  const lines: string[] = [];
  const nonstandard = e.alternates.find((a) => a.status === "nonstandard" && toHiragana(a.reading) === typed);
  if (nonstandard) lines.push(`${nonstandard.reading} は${ALTERNATE_STATUS_LABELS.nonstandard}の読みとして記録されている`);

  if (e.cls === "jukujikun") {
    lines.push(`熟字訓 — 「${e.reading}」は語全体の読みで、字ごとに分解できない`);
    return { ...base, outcome: "miss_wholeword", lines, label: DRILL_LABELS.missWholeWord };
  }

  const steps = typed.length > 0 ? segment(e.chars, typed) : null;
  if (!steps) {
    lines.push(`${DRILL_LABELS.noPartialMatch} — 正解は ${e.reading}`);
    return { ...base, outcome: "no_match", lines, label: DRILL_LABELS.noPartialMatch };
  }

  const chars: CharAnalysis[] = e.chars.map((c, i) => {
    const s = steps[i];
    return {
      k: c.k,
      expected: toHiragana(c.r ?? ""),
      expectedType: c.t,
      typed: s.kana,
      ok: s.ok,
      cause: s.cause,
      typedType: s.c?.type ?? (s.ok ? c.t : null),
      change: s.change,
      line: charLine(c, s),
    };
  });
  const causes = chars.map((c) => c.cause).filter((c): c is MissCause => c !== null);
  const cause = CAUSE_PRIORITY.find((p) => causes.includes(p)) ?? null;
  if (cause === null) {
    // Every character matched its recorded reading but the whole did not: cannot happen for
    // decomposable entries (reading equals the concatenation), kept as a guard.
    lines.push(`${DRILL_LABELS.noPartialMatch} — 正解は ${e.reading}`);
    return { ...base, outcome: "no_match", chars, lines, label: DRILL_LABELS.noPartialMatch };
  }
  for (const c of chars) if (c.line) lines.push(c.line);
  return { ...base, outcome: "miss", cause, chars, lines, label: CAUSE_LABELS[cause] };
}
