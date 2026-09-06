import { describe, expect, it } from "vitest";
import {
  AlternateReadingSchema,
  ClassificationSchema,
  DatasetSchema,
  EntrySchema,
  deriveClassification,
  type Entry,
} from "./schema";
import { CLASSIFICATION_LABELS, PHONETIC_CHANGE_LABELS } from "./labels";

// A hand-built valid entry, matching DATA_SPEC.md §2's example.
function validEntry(): Entry {
  return {
    id: "cr_0001",
    source_id: "on_on_01",
    source_batch: 1,
    compound: "学校",
    reading: "がっこう",
    char_count: 2,
    has_kana: false,
    classification: "on_on",
    decomposable: true,
    characters: [
      {
        kanji: "学",
        reading_in_compound: "がっ",
        reading_type: "on",
        on_readings: ["ガク"],
        kun_readings: ["まなぶ"],
        reading_note: "ガク → がっ via 促音 before こ",
      },
      {
        kanji: "校",
        reading_in_compound: "こう",
        reading_type: "on",
        on_readings: ["コウ"],
        kun_readings: [],
        reading_note: null,
      },
    ],
    alternate_readings: [],
    contested: false,
    contested_note: null,
    phonetic_changes: ["sokuon"],
    phonetic_change_detail: "ガク + コウ → がっこう",
    difficulty: 1,
    difficulty_rationale: "Universal anchor.",
    real_world_context: "School, education.",
    trap_note: null,
    chains: ["学", "校"],
    tags: [],
  };
}

const REQUIRED_FIELDS: (keyof Entry)[] = [
  "id",
  "source_id",
  "source_batch",
  "compound",
  "reading",
  "char_count",
  "has_kana",
  "classification",
  "decomposable",
  "characters",
  "alternate_readings",
  "contested",
  "contested_note",
  "phonetic_changes",
  "phonetic_change_detail",
  "difficulty",
  "difficulty_rationale",
  "real_world_context",
  "trap_note",
  "chains",
  "tags",
];

describe("EntrySchema", () => {
  it("accepts a hand-built valid entry", () => {
    expect(EntrySchema.safeParse(validEntry()).success).toBe(true);
  });

  it.each(REQUIRED_FIELDS)("rejects an entry missing %s", (field) => {
    const e: Record<string, unknown> = { ...validEntry() };
    delete e[field];
    expect(EntrySchema.safeParse(e).success).toBe(false);
  });

  it("rejects an unknown top-level field", () => {
    expect(EntrySchema.safeParse({ ...validEntry(), extra: 1 }).success).toBe(false);
  });

  it("rejects the retired classification `irregular`", () => {
    expect(ClassificationSchema.safeParse("irregular").success).toBe(false);
    expect(EntrySchema.safeParse({ ...validEntry(), classification: "irregular" }).success).toBe(false);
  });

  it("rejects the source-only classification `n/a`", () => {
    expect(ClassificationSchema.safeParse("n/a").success).toBe(false);
    expect(EntrySchema.safeParse({ ...validEntry(), classification: "n/a" }).success).toBe(false);
  });

  it("rejects a non-hiragana reading", () => {
    expect(EntrySchema.safeParse({ ...validEntry(), reading: "ガッコウ" }).success).toBe(false);
  });

  it("rejects a difficulty outside 1–4", () => {
    expect(EntrySchema.safeParse({ ...validEntry(), difficulty: 5 }).success).toBe(false);
    expect(EntrySchema.safeParse({ ...validEntry(), difficulty: 0 }).success).toBe(false);
  });

  it("rejects a multi-character kanji", () => {
    const e = validEntry();
    e.characters[0].kanji = "学校";
    expect(EntrySchema.safeParse(e).success).toBe(false);
  });

  it("rejects hiragana in on_readings and katakana in kun_readings", () => {
    const a = validEntry();
    a.characters[0].on_readings = ["がく"];
    expect(EntrySchema.safeParse(a).success).toBe(false);
    const b = validEntry();
    b.characters[0].kun_readings = ["マナブ"];
    expect(EntrySchema.safeParse(b).success).toBe(false);
  });

  it("allows a null reading_in_compound (熟字訓 components)", () => {
    const e = validEntry();
    e.characters[0].reading_in_compound = null;
    expect(EntrySchema.safeParse(e).success).toBe(true);
  });
});

describe("AlternateReadingSchema", () => {
  it("requires source_status and an enum status", () => {
    const ok = {
      reading: "まいげつ",
      classification: "on_on",
      context: "formal",
      status: "standard",
      source_status: "standard",
    };
    expect(AlternateReadingSchema.safeParse(ok).success).toBe(true);
    expect(AlternateReadingSchema.safeParse({ ...ok, status: "variant — widespread" }).success).toBe(false);
    const { source_status: _dropped, ...noSource } = ok;
    expect(AlternateReadingSchema.safeParse(noSource).success).toBe(false);
  });
});

describe("DatasetSchema", () => {
  it("requires $schema_version 1.0.0", () => {
    expect(DatasetSchema.safeParse({ $schema_version: "1.0.0", entries: [validEntry()] }).success).toBe(true);
    expect(DatasetSchema.safeParse({ $schema_version: "0.1.0", entries: [] }).success).toBe(false);
  });
});

describe("deriveClassification", () => {
  it("implements the §7.2 table", () => {
    expect(deriveClassification("on", "on")).toBe("on_on");
    expect(deriveClassification("kun", "kun")).toBe("kun_kun");
    expect(deriveClassification("on", "kun")).toBe("juubako");
    expect(deriveClassification("kun", "on")).toBe("yutou");
    expect(deriveClassification("neither", "on")).toBeNull();
  });
});

describe("labels", () => {
  it("maps every classification and phonetic change to a Japanese label", () => {
    for (const code of ClassificationSchema.options) expect(CLASSIFICATION_LABELS[code]).toMatch(/\p{Script=Han}/u);
    expect(Object.keys(PHONETIC_CHANGE_LABELS)).toHaveLength(6);
  });
});
