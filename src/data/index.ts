// The app's data layer (BUILD_PLAN.md 1.1). Loads the generated compact
// dataset once (via ./load), builds the chain index from data/chains.json, the
// character index for Browse, and the classification / difficulty / phonetic-
// change indices, and exposes the small helpers the modes share. Everything is
// computed at module load from the two data files; nothing here is typed by
// hand from a plan document (CLAUDE.md §7).
import chainsFile from "../../data/chains.json";
import type { CompactChar, CompactEntry } from "./compact";
import { CLASSIFICATION_ORDER, PHONETIC_CHANGE_ORDER, READING_TYPE_LABELS } from "./labels";
import { ENTRIES } from "./load";
import type { ChainsFile, Classification, PhoneticChange, RuleReliability } from "./schema";

export { ENTRIES, classificationCounts, imbalanceSentence, matchesSearch } from "./load";

// ---------------------------------------------------------------- entries by id

export const ENTRY_BY_ID: ReadonlyMap<string, CompactEntry> = new Map(ENTRIES.map((e) => [e.id, e]));

export function entryById(id: string): CompactEntry | undefined {
  return ENTRY_BY_ID.get(id);
}

// ---------------------------------------------------------------- chains (DATA_SPEC.md §5.2)

export type ResolvedChain = {
  character: string;
  displayOrder: number;
  rule: string | null;
  reliability: RuleReliability;
  teachingNote: string | null;
  /** Members in `entry_order`, resolved; ids that resolve to no entry are dropped. */
  entries: CompactEntry[];
  /** Members named in the chain's `exceptions`, resolved. */
  exceptions: CompactEntry[];
};

const MIN_LESSON_ENTRIES = 3;

/**
 * A chain is a lesson only if its rule reliability is not "none" AND it has at
 * least three entries (Session 3 brief §5 rule 3; DATA_SPEC.md §5.2). Anything
 * else is a list, browsable but never presented as a chain lesson.
 */
export function isLesson(chain: Pick<ResolvedChain, "reliability" | "entries">): boolean {
  return chain.reliability !== "none" && chain.entries.length >= MIN_LESSON_ENTRIES;
}

export function isException(chain: Pick<ResolvedChain, "exceptions">, entry: Pick<CompactEntry, "id">): boolean {
  return chain.exceptions.some((x) => x.id === entry.id);
}

function resolveChain(c: ChainsFile["chains"][number]): ResolvedChain {
  const entries = c.entry_order.map((id) => ENTRY_BY_ID.get(id)).filter((e): e is CompactEntry => e !== undefined);
  const exceptions = (c.exceptions ?? []).map((id) => ENTRY_BY_ID.get(id)).filter((e): e is CompactEntry => e !== undefined);
  return { character: c.character, displayOrder: c.display_order, rule: c.rule, reliability: c.rule_reliability, teachingNote: c.teaching_note, entries, exceptions };
}

/** Every row of data/chains.json, resolved, in display order. */
export const ALL_CHAINS: readonly ResolvedChain[] = (chainsFile as ChainsFile).chains
  .map(resolveChain)
  .sort((a, b) => a.displayOrder - b.displayOrder);

/** The chains Chain Explorer offers: lesson chains only, in display order (手, 場, 夕, 毎, then any other lesson chain). */
export const LESSON_CHAINS: readonly ResolvedChain[] = ALL_CHAINS.filter(isLesson);

export const CHAIN_BY_CHARACTER: ReadonlyMap<string, ResolvedChain> = new Map(ALL_CHAINS.map((c) => [c.character, c]));

export function lessonChain(character: string): ResolvedChain | undefined {
  const c = CHAIN_BY_CHARACTER.get(character);
  return c && isLesson(c) ? c : undefined;
}

// ---------------------------------------------------------------- filter indices

function group<K extends string | number>(keys: readonly K[], keyOf: (e: CompactEntry) => K[]): Record<K, CompactEntry[]> {
  const out = Object.fromEntries(keys.map((k) => [k, [] as CompactEntry[]])) as Record<K, CompactEntry[]>;
  for (const e of ENTRIES) for (const k of keyOf(e)) out[k].push(e);
  return out;
}

export const BY_CLASSIFICATION: Readonly<Record<Classification, CompactEntry[]>> = group(CLASSIFICATION_ORDER, (e) => [e.cls]);

export const DIFFICULTY_LEVELS = [1, 2, 3, 4] as const;
export const BY_DIFFICULTY: Readonly<Record<(typeof DIFFICULTY_LEVELS)[number], CompactEntry[]>> = group(DIFFICULTY_LEVELS, (e) =>
  DIFFICULTY_LEVELS.includes(e.diff as 1 | 2 | 3 | 4) ? [e.diff as 1 | 2 | 3 | 4] : [],
);

export const BY_PHONETIC_CHANGE: Readonly<Record<PhoneticChange, CompactEntry[]>> = group(PHONETIC_CHANGE_ORDER, (e) => e.changes);

// ---------------------------------------------------------------- character index (Browse)

const isKanji = (ch: string) => /\p{Script=Han}/u.test(ch);

/** Every kanji in every compound → the entries containing it, in dataset order. */
export const BY_CHARACTER: ReadonlyMap<string, CompactEntry[]> = (() => {
  const m = new Map<string, CompactEntry[]>();
  for (const e of ENTRIES) for (const ch of new Set([...e.compound].filter(isKanji))) m.set(ch, [...(m.get(ch) ?? []), e]);
  return m;
})();

export function entriesWithCharacter(ch: string): CompactEntry[] {
  return BY_CHARACTER.get(ch) ?? [];
}

// ---------------------------------------------------------------- display helpers

export type DisplayReadingType = { k: string; r: string | null; t: CompactChar["t"]; label: string };
export type DisplayReadingTypes = {
  /** True for 熟字訓: the reading attaches to the whole word (DATA_SPEC.md §2.1). */
  wholeWord: boolean;
  /** Per-character rows. For a 熟字訓 whose source recorded no split, `r` is null on every row and `label` is "—". */
  chars: DisplayReadingType[];
  /** True when at least one character carries a reading split (熟字訓 with the source's split, or any decomposable entry). */
  hasSplit: boolean;
};

/**
 * Per-character reading types for display. Handles 熟字訓 (null or split
 * readings), char_count 1 (峠) and 3 (朝寝坊, 一段落) without throwing.
 */
export function displayReadingTypes(entry: CompactEntry): DisplayReadingTypes {
  const chars = (entry.chars ?? []).map((c) => ({ k: c.k, r: c.r ?? null, t: c.t, label: READING_TYPE_LABELS[c.t] ?? "—" }));
  return { wholeWord: entry.cls === "jukujikun", chars, hasSplit: chars.some((c) => c.r !== null) };
}

export function isUnclassifiable(entry: CompactEntry): boolean {
  return entry.tags.includes("unclassifiable");
}
