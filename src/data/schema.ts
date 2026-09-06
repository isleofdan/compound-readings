// Canonical dataset schema (DATA_SPEC.md §2, §2.1, §2.2, §3, §6, §7.3, §8).
// This is the only place the shape of an entry is defined. TypeScript types are
// derived from it with z.infer, never written by hand. The validator, the
// consolidator, the compact transform and the app all import from here.
import { z } from "zod";

// DATA_SPEC.md §3 — five values. `irregular` and `n/a` are source-only and are
// mapped away during consolidation; they are not members of this enum.
export const ClassificationSchema = z.enum(["on_on", "kun_kun", "juubako", "yutou", "jukujikun"]);
export type Classification = z.infer<typeof ClassificationSchema>;

// DATA_SPEC.md §2.1 — `neither` is the literal source token for 熟字訓 components.
export const ReadingTypeSchema = z.enum(["on", "kun", "neither"]);
export type ReadingType = z.infer<typeof ReadingTypeSchema>;

// DATA_SPEC.md §6 — controlled vocabulary.
export const PhoneticChangeSchema = z.enum([
  "rendaku",
  "sokuon",
  "handakuon",
  "long_vowel",
  "vowel_change",
  "other",
]);
export type PhoneticChange = z.infer<typeof PhoneticChangeSchema>;

// DATA_SPEC.md §7.3 — status enum for alternate readings.
export const AlternateStatusSchema = z.enum([
  "standard",
  "variant_accepted",
  "variant_spreading",
  "prescriptive_only",
  "disputed",
  "nonstandard",
]);
export type AlternateStatus = z.infer<typeof AlternateStatusSchema>;

// DATA_SPEC.md §8 — suggested tag values. Tags are free-form strings; this list
// documents the values consolidation is allowed to apply.
export const KNOWN_TAGS = [
  "kokuji",
  "meta",
  "meal_matrix",
  "number",
  "color",
  "keigo_adjacent",
  "place_name",
  "counter",
  "unclassifiable",
] as const;

const HIRAGANA_ONLY = /^[ぁ-ゖゝゞー]+$/u;
const KATAKANA_ONLY = /^[ァ-ヺーヽヾ]+$/u;

export const CharacterSchema = z
  .object({
    kanji: z.string().refine((s) => [...s].length === 1, "kanji must be exactly one character"),
    // May be null on 熟字訓 components; the source's split is preserved when present.
    reading_in_compound: z.string().min(1).nullable(),
    reading_type: ReadingTypeSchema,
    on_readings: z.array(z.string().regex(KATAKANA_ONLY, "on readings are katakana")),
    kun_readings: z.array(z.string().regex(HIRAGANA_ONLY, "kun readings are hiragana")),
    reading_note: z.string().nullable(),
  })
  .strict();
export type Character = z.infer<typeof CharacterSchema>;

export const AlternateReadingSchema = z
  .object({
    reading: z.string().regex(HIRAGANA_ONLY, "reading is hiragana"),
    // May differ from the entry's primary classification (毎月). The source
    // also uses `irregular` here for ひとだんらく; it is mapped per §3 during
    // consolidation and recorded in the migration report.
    classification: ClassificationSchema,
    context: z.string(),
    status: AlternateStatusSchema,
    // The source's free-text status, verbatim (§7.3).
    source_status: z.string(),
  })
  .strict();
export type AlternateReading = z.infer<typeof AlternateReadingSchema>;

export const EntrySchema = z
  .object({
    id: z.string().regex(/^cr_\d{4}$/, "canonical id is cr_NNNN"),
    source_id: z.string().min(1),
    source_batch: z.number().int().min(1).max(4),

    compound: z.string().min(1),
    reading: z.string().regex(HIRAGANA_ONLY, "reading is hiragana only"),
    // Kanji only — kana inside the compound are not counted (§7.1).
    char_count: z.number().int().min(1),
    // True when `compound` contains kana as written (§7.1).
    has_kana: z.boolean(),

    classification: ClassificationSchema,
    decomposable: z.boolean(),

    characters: z.array(CharacterSchema).min(1),
    alternate_readings: z.array(AlternateReadingSchema),

    contested: z.boolean(),
    contested_note: z.string().nullable(),

    phonetic_changes: z.array(PhoneticChangeSchema),
    phonetic_change_detail: z.string().nullable(),

    difficulty: z.number().int().min(1).max(4),
    difficulty_rationale: z.string().min(1),

    real_world_context: z.string().min(1),
    trap_note: z.string().nullable(),

    chains: z.array(z.string().refine((s) => [...s].length === 1, "chain key is one kanji")),
    tags: z.array(z.string().min(1)),
  })
  .strict();
export type Entry = z.infer<typeof EntrySchema>;

export const DatasetSchema = z
  .object({
    $schema_version: z.literal("1.0.0"),
    entries: z.array(EntrySchema),
  })
  .strict();
export type Dataset = z.infer<typeof DatasetSchema>;

// DATA_SPEC.md §5.2 — chain-level metadata in data/chains.json.
export const RuleReliabilitySchema = z.enum(["clean", "usually", "none"]);
export type RuleReliability = z.infer<typeof RuleReliabilitySchema>;

export const ChainSchema = z
  .object({
    character: z.string().refine((s) => [...s].length === 1, "chain character is one kanji"),
    display_order: z.number().int().min(1),
    rule: z.string().nullable(),
    rule_reliability: RuleReliabilitySchema,
    teaching_note: z.string().nullable(),
    entry_order: z.array(z.string().regex(/^cr_\d{4}$/)),
  })
  .strict();
export type Chain = z.infer<typeof ChainSchema>;

export const ChainsFileSchema = z
  .object({
    $status: z.enum(["proposed", "approved"]),
    chains: z.array(ChainSchema),
  })
  .strict();
export type ChainsFile = z.infer<typeof ChainsFileSchema>;

// DATA_SPEC.md §7.2 — the derivation table. Returns null when a value is not on/kun.
export function deriveClassification(t1: ReadingType, t2: ReadingType): Classification | null {
  if (t1 === "on" && t2 === "on") return "on_on";
  if (t1 === "kun" && t2 === "kun") return "kun_kun";
  if (t1 === "on" && t2 === "kun") return "juubako";
  if (t1 === "kun" && t2 === "on") return "yutou";
  return null;
}
