# RECOVERY_REPORT.md — Dataset Reconstruction

All four batch files and the cross-reference index were recovered verbatim from
the source chat (`Compound kanji reading classification framework`) and validated
programmatically. This report records what was found. Every number here is
computed from the reconstructed files.

## Files recovered

| File | Entries | Status |
|---|---|---|
| `compound_readings_data.json` | 30 | Complete, parses, includes `$entry_schema` block |
| `compound_readings_batch2.json` | 50 | Complete, parses |
| `compound_readings_batch3.json` | 46 | Complete, parses |
| `compound_readings_batch4.json` | 42 | Complete, parses |
| `compound_readings_index.md` | — | Complete; covers batches 1–3 only |
| `compound_readings_analysis.md` | — | **Not yet reconstructed.** Present in full in the source chat; recoverable the same way. |

**Batch 5 confirmed discarded.** It was truncated mid-entry at `juubako_86`
(先着), inside an unclosed `characters` array. Not salvageable and not wanted.

## Headline correction: 168 entries, not 175

The "~175" figure that has followed this project came from batch 4's own header
string (`"Batch 4 — entries 127-175"`), written before generation. The file
contains 42 entries, so the true total is 30 + 50 + 46 + 42 = **168**.

## Classification distribution

| Classification | Batch 1 | Batch 2 | Batch 3 | Batch 4 | **Total** |
|---|---|---|---|---|---|
| 音音 | 7 | 13 | 18 | 15 | **53** |
| 訓訓 | 7 | 9 | 16 | 14 | **46** |
| 重箱 | 8 | 9 | 2 | 6 | **25** |
| 湯桶 | 6 | 7 | 5 | 2 | **20** |
| 熟字訓 | 2 | 12 | 4 | 2 | **20** |
| irregular | 0 | 0 | 1 | 2 | **3** |
| n/a | 0 | 0 | 0 | 1 | **1** |
| **Total** | **30** | **50** | **46** | **42** | **168** |

The 重箱 gap is real and worse than the index reported: **25 重箱 against 53 音音**,
a 2:1 shortfall. Batch 4 opened by naming the 重箱 gap as its top priority and
then added 6 重箱 against 15 音音.

## The index's count table is wrong

The index reports batch 3 as 音音 15 / 訓訓 12 / 重箱 3 / 湯桶 7 / 熟字訓 7 /
irregular 2. The file contains 音音 18 / 訓訓 16 / 重箱 2 / 湯桶 5 / 熟字訓 4 /
irregular 1. The published table matches neither the actual classifications nor
the ID prefixes. Its batch 1 and 2 rows are closer but still count by ID prefix
rather than by classification. **Regenerate the index; do not port its numbers.**

## Integrity findings

| Check | Result |
|---|---|
| Duplicate IDs across batches | **0** — all 168 unique |
| ID prefix contradicts classification | **45 of 168** |
| Classification derivation violations (2-char) | **2 of 163** |
| Distinct `classification` values | **7** (five framework + `irregular` + `n/a`) |
| `reading_type` values | `on` 156, `kun` 144, `neither` 39 |
| `phonetic_changes` tokens | `rendaku` 24, `sokuon` 9, `other` 4 |
| Entries with `alternate_readings` | 21 |
| Character counts | 163 two-char, 4 three-char, 1 single-char |

**The linguistic content is sound; the metadata is not.** Only two entries out of
163 two-character compounds actually contradict the on/kun derivation. The
disorder is concentrated in IDs, enum values, and prose fields.

### ID prefixes are noise (first 12 of 45)

| ID | Compound | Actual classification |
|---|---|---|
| `yutou_12` | 朝日 | 訓訓 |
| `juubako_19` | 工場 | 音音 |
| `juubako_20` | 新手 | 訓訓 |
| `juubako_21` | 生地 | 湯桶 |
| `juubako_23` | 番地 | 音音 |
| `juubako_24` | 練習 | 音音 |
| `on_on_22` | 場面 | 湯桶 |
| `on_on_26` | 続柄 | 訓訓 |
| `on_on_34` | 夕食 | 湯桶 |
| `yutou_15` | 雨量 | 音音 |
| `yutou_16` | 割引 | 訓訓 |
| `yutou_18` | 朝飯 | 訓訓 |

Never infer classification from an ID.

### The two real derivation violations

Both are incomplete self-corrections, and both are in batch 4:

- **革靴** (`juubako_34`) — `reading_note` argues くつ is kun; `classification`
  was updated to `kun_kun` to match; `reading_type` still says `on`.
- **初耳** (`juubako_45`) — `reading_note` argues はつ is kun; `classification`
  updated to `kun_kun`; `reading_type` still says `on`.

In both, the note is correct and the `reading_type` field is stale. Fix the
field, keep the conclusion.

### Mid-thought reasoning left in data fields

Six entries carry the generating model's live self-correction inside a
`reading_note`, `difficulty_rationale`, or `trap_note`: 雨量, 場面, 真っ赤, 革靴,
灰色, 初耳, 音読み. Clean the prose but preserve the conclusions — in several
cases the self-correction *is* the pedagogy.

## Character chains present in the data

Characters appearing in three or more entries, with how many classifications
they span. This is the raw material for Chain Explorer.

| Character | Entries | Classifications spanned | Breakdown |
|---|---|---|---|
| 場 | 9 | 4 | 重箱×3, 音音×3, 湯桶×2, 訓訓×1 |
| 手 | 9 | 3 | 訓訓×4, 湯桶×4, 音音×1 |
| 物 | 9 | 4 | 訓訓×6, 熟字訓×1, 重箱×1, 音音×1 |
| 雨 | 6 | 4 | 熟字訓×3, 訓訓×1, 湯桶×1, 音音×1 |
| 本 | 6 | 2 | 重箱×3, 湯桶×3 |
| 朝 | 5 | 4 | 訓訓×2, 重箱×1, 音音×1, irregular×1 |
| 一 | 5 | 3 | 熟字訓×2, 訓訓×2, 音音×1 |
| 毎 | 5 | 2 | 重箱×3, 音音×2 |
| 間 | 4 | 3 | 訓訓×2, 重箱×1, 音音×1 |
| 生 | 4 | 3 | 訓訓×2, 音音×1, 湯桶×1 |
| 夕 | 4 | 2 | 湯桶×3, 訓訓×1 |
| 新 | 3 | 3 | 重箱×1, 訓訓×1, 音音×1 |
| 茶 | 3 | 2 | 重箱×2, 音音×1 |
| 焼 | 3 | 2 | 訓訓×2, 湯桶×1 |
| 金 | 3 | 3 | 訓訓×1, 湯桶×1, 音音×1 |
| 替 | 3 | 3 | 音音×1, 熟字訓×1, 重箱×1 |
| 額 | 3 | 2 | 音音×2, 重箱×1 |
| 番 | 3 | 2 | 音音×2, 重箱×1 |

## What still needs doing before Claude Code

1. Reconstruct `compound_readings_analysis.md` from the source chat (one
   session; it contains the interaction-model rationale and the original honest
   assessment, including the ~33% figure).
2. Hand Claude Code the five recovered files plus `CLAUDE.md`, `BUILD_PLAN.md`,
   `DATA_SPEC.md`, and this report.
3. The React prototype `.jsx` was never located in this chat. If Dan saved it,
   upload it; if not, its interaction design is described in `BUILD_PLAN.md`
   Phase 1 and its compact schema in `DATA_SPEC.md` §4.2. The prototype's
   `chains[]` data would otherwise have to be rebuilt from the index and trap
   notes (Phase 0.5).
