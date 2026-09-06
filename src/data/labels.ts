// The ONE module mapping ASCII codes to Japanese display strings. Code uses the
// ASCII identifiers (CLAUDE.md §8); the UI shows the Japanese terms. Nothing
// else in the repo may define these strings.

import type { AlternateStatus, Classification, PhoneticChange, RuleReliability } from "./schema";

export const CLASSIFICATION_ORDER: readonly Classification[] = [
  "on_on",
  "kun_kun",
  "juubako",
  "yutou",
  "jukujikun",
] as const;

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  on_on: "音音",
  kun_kun: "訓訓",
  juubako: "重箱",
  yutou: "湯桶",
  jukujikun: "熟字訓",
};

export const PHONETIC_CHANGE_ORDER: readonly PhoneticChange[] = [
  "rendaku",
  "sokuon",
  "handakuon",
  "long_vowel",
  "vowel_change",
  "other",
] as const;

export const PHONETIC_CHANGE_LABELS: Record<PhoneticChange, string> = {
  rendaku: "連濁",
  sokuon: "促音",
  handakuon: "半濁音化",
  long_vowel: "長音化",
  vowel_change: "母音変化",
  other: "その他",
};

export const READING_TYPE_LABELS = {
  on: "音",
  kun: "訓",
  neither: "—",
} as const;

export function classificationLabel(code: Classification): string {
  return CLASSIFICATION_LABELS[code];
}

export function phoneticChangeLabel(code: PhoneticChange): string {
  return PHONETIC_CHANGE_LABELS[code];
}

// DATA_SPEC.md §5.2 — how a chain's rule reliability is labeled in the UI.
// "clean" may say rule; "usually" is hedged and never says rule; "none" chains
// are not lessons and are never shown as one.
export const RELIABILITY_LABELS: Record<RuleReliability, string> = {
  clean: "規則",
  usually: "だいたい",
  none: "規則なし",
};

export const EXCEPTION_LABEL = "例外";

// DATA_SPEC.md §7.3 — how an alternate reading's status is labeled in the UI.
// No label says "correct" or "wrong": contested readings are shown with their
// status, never collapsed to one answer (CLAUDE.md §3.3).
export const ALTERNATE_STATUS_LABELS: Record<AlternateStatus, string> = {
  standard: "標準",
  variant_accepted: "変種・許容",
  variant_spreading: "変種・広まりつつある",
  prescriptive_only: "規範のみ・実用まれ",
  disputed: "論争中",
  nonstandard: "非標準",
};

// Session 4 brief §5 rule 8 — the UI's label words are Japanese; only the
// tab hints under 鎖 / 検索 and proper nouns stay as they were. Prose sentences
// (explanations, the imbalance sentence) are not labels and are unchanged.
export const UI_LABELS = {
  reveal: "開く",
  revealAll: "全部開く",
  hideAll: "全部閉じる",
  alsoRead: "別読み",
  context: "場面",
  trap: "罠",
  contested: "異論あり",
  source: "出典",
  backToChains: "← 鎖",
  phoneticChanges: "音変化",
  tags: "タグ",
  chains: "鎖",
  difficulty: "難易度",
  none: "なし",
  /** "N語" — a count of entries. */
  entries: (n: number) => `${n}語`,
  /** "N / M語" — how many of the entries are shown. */
  shown: (n: number, total: number) => `${n} / ${total}語`,
} as const;

// Session 4 brief §5 rule 8 — the drill labels, Japanese from the start.
export const DRILL_LABELS = {
  drillTitle: "分類ドリル",
  predictTitle: "読み予想",
  correct: "正解",
  correctVariant: "別読みで正解",
  wrong: "不正解",
  missClassification: "分類の誤り",
  missInventory: "読みの誤り",
  missPhonetic: "音変化の誤り",
  missWholeWord: "熟字訓の誤り",
  noPartialMatch: "部分一致なし",
  next: "次へ",
  answer: "答える",
  reset: "リセット",
  filter: "絞り込み",
  tally: "今回",
} as const;
