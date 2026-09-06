// The §6-class fixes applied to the canonical dataset during consolidation
// (CLAUDE.md §6; START-HERE §5 rule 3). Each fix is an explicit, named patch on
// one field of one source entry, with the defect number and a one-line reason.
// The consolidator asserts that the field's current value equals `before`
// before writing `after`, so a change in the source files cannot be patched
// silently; every applied patch is a row in reports/01-migration.md with both
// values. Source files are never edited.
//
// Defects 1, 2, 3 and 8 are consolidation rules (ID reassignment, token
// normalization, `neither` pass-through), not patches. Defect 6 is a validator
// rule (WARN), not a patch. Defect 7 is handled by the prototype merge (the
// verbose entry wins; nothing to patch). That leaves defects 4 and 5, plus the
// two stale `reading_type` fields the audit found (革靴, 初耳), which the brief
// counts as §6-class.

export type Fix = {
  /** Defect number from CLAUDE.md §6, or "audit" for the two stale fields. */
  defect: string;
  source_id: string;
  compound: string;
  /** Field path on the source-shaped entry, e.g. "trap_note" or "characters[1].reading_type". */
  path: string;
  before: string;
  after: string;
  reason: string;
  /** For defect 5 only: the dictionary source checked, as CLAUDE.md §6.5 requires. */
  verified_against?: string;
};

export const FIXES: Fix[] = [
  {
    defect: "audit §2.3 (stale field, §6-class per the brief)",
    source_id: "juubako_34",
    compound: "革靴",
    path: "characters[1].reading_type",
    before: "on",
    after: "kun",
    reason:
      "The reading_note argues くつ is kun (ぐつ is くつ with 連濁) and the classification was updated to kun_kun; the reading_type field was left stale.",
  },
  {
    defect: "audit §2.3 (stale field, §6-class per the brief)",
    source_id: "juubako_45",
    compound: "初耳",
    path: "characters[0].reading_type",
    before: "on",
    after: "kun",
    reason:
      "The reading_note argues はつ is kun (初's on reading is ショ) and the classification was updated to kun_kun; the reading_type field was left stale.",
  },
  {
    defect: "6.4",
    source_id: "juubako_58",
    compound: "音読み",
    path: "trap_note",
    before:
      "音読み is 重箱読み. 訓読み is 訓訓. 重箱読み is 重箱読み (重=ジュウ on, 箱=ばこ kun). 湯桶読み is 湯桶読み (湯=ゆ kun, 桶=トウ... wait, 桶=おけ is kun, so 湯桶 is actually 訓訓, not 湯桶). This meta-recursion is worth one drill question for the sheer delight of it.",
    after:
      "音読み is 重箱読み. 訓読み is also 重箱読み — クン is the on reading of 訓. 重箱読み is 重箱読み (重=ジュウ on, 箱=ばこ kun). 湯桶読み is 湯桶読み (湯=ゆ kun, 桶=トウ... wait, 桶=おけ is kun, so 湯桶 is actually 訓訓, not 湯桶). This meta-recursion is worth one drill question for the sheer delight of it.",
    reason:
      "The note asserted 訓読み is 訓訓; the 訓読み entry itself records クン as the on reading of 訓, which makes 訓読み 重箱. The note was wrong.",
  },
  {
    defect: "6.4",
    source_id: "juubako_58",
    compound: "音読み",
    path: "difficulty_rationale",
    before: "Meta entry — the word 音読み itself is 重箱読み. And 訓読み(くんよみ) is 訓訓読み. Delightful self-reference.",
    after: "Meta entry — the word 音読み itself is 重箱読み. And 訓読み(くんよみ) is 重箱読み too. Delightful self-reference.",
    reason:
      "The same wrong claim (訓読み is 訓訓) also appears in this entry's difficulty_rationale; defect 6.4 names the trap note, and leaving the identical error in the sibling field would keep the contradiction alive.",
  },
  {
    defect: "6.5",
    source_id: "juubako_58",
    compound: "音読み",
    path: "trap_note",
    before:
      "音読み is 重箱読み. 訓読み is also 重箱読み — クン is the on reading of 訓. 重箱読み is 重箱読み (重=ジュウ on, 箱=ばこ kun). 湯桶読み is 湯桶読み (湯=ゆ kun, 桶=トウ... wait, 桶=おけ is kun, so 湯桶 is actually 訓訓, not 湯桶). This meta-recursion is worth one drill question for the sheer delight of it.",
    after:
      "音読み is 重箱読み. 訓読み is also 重箱読み — クン is the on reading of 訓. 重箱読み is 重箱読み (重=ジュウ on, 箱=ばこ kun). 湯桶読み is 湯桶読み (湯=ゆ kun, 桶=トウ on — 桶 has the on reading トウ and the kun reading おけ, and ゆとう uses the on reading). This meta-recursion is worth one drill question for the sheer delight of it.",
    reason:
      "Reasoning-in-progress removed from the data field. The self-correction it contained was itself wrong: in ゆとう, 桶 is read トウ (on), so 湯桶 is self-exemplifying 湯桶読み.",
    verified_against:
      "漢字ペディア (日本漢字能力検定協会), entry 桶: 音読み トウ, 訓読み おけ, compound 湯桶 read ゆトウ; and コトバンク (デジタル大辞泉), entry 湯桶読み: 「湯桶」の「ゆ」が訓、「とう」が音. Both reached through web search on 2026-09-06 from the cloud session, whose network proxy blocks direct fetches of dictionary sites; the search engine's quoted extracts of those two pages are what was read.",
  },
];
