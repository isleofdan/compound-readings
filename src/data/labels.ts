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
  clean: "Rule",
  usually: "Usually",
  none: "No rule",
};

export const EXCEPTION_LABEL = "Exception";

// DATA_SPEC.md §7.3 — how an alternate reading's status is labeled in the UI.
// No label says "correct" or "wrong": contested readings are shown with their
// status, never collapsed to one answer (CLAUDE.md §3.3).
export const ALTERNATE_STATUS_LABELS: Record<AlternateStatus, string> = {
  standard: "standard",
  variant_accepted: "variant · accepted",
  variant_spreading: "variant · spreading",
  prescriptive_only: "prescribed, rare in use",
  disputed: "disputed",
  nonstandard: "nonstandard",
};
