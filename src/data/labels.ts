// The ONE module mapping ASCII codes to Japanese display strings. Code uses the
// ASCII identifiers (CLAUDE.md §8); the UI shows the Japanese terms. Nothing
// else in the repo may define these strings.

import type { Classification, PhoneticChange } from "./schema";

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
