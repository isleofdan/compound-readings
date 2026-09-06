# DATA_SPEC.md — Canonical Dataset Specification

Authoritative definition of the compound-readings dataset. Where this document
and any other disagree, this one wins. Read `CLAUDE.md` for project context
first.

---

## 1. Files and their roles

| Path | Role | Editable |
|---|---|---|
| `data/source/*.json` | The four original batch files, exactly as produced | **Never.** Read-only history. |
| `data/source/prototype-entries.json` | Compact entries extracted from the React prototype | **Never.** Read-only. |
| `data/compounds.json` | Canonical dataset — single source of truth | Yes, by hand, carefully |
| `data/chains.json` | Chain-level pedagogical metadata | Yes, by hand |
| `data/generated/compounds.compact.json` | App-facing compact form | **Never.** Build output. |

The compact form exists because the prototype used it and because it is smaller
over the wire. It is derived. If anyone hand-edits it, the next build silently
destroys their work — mark the file with a `"$generated": true` key and a
warning comment, and gitignore it or commit it clearly labelled.

---

## 2. Canonical entry schema

```jsonc
{
  "id": "cr_0001",              // canonical, assigned at consolidation
  "source_id": "on_on_01",      // original ID, preserved verbatim
  "source_batch": 1,            // 1–4

  "compound": "学校",            // kanji as written
  "reading": "がっこう",          // primary reading, hiragana
  "char_count": 2,              // number of kanji in `compound` (kanji only, §7.1)
  "has_kana": false,            // true when `compound` contains kana as written (真っ赤, 気持ち)

  "classification": "on_on",    // enum, §3
  "decomposable": true,         // false for jukujikun

  "characters": [ /* §2.1 */ ],
  "alternate_readings": [ /* §2.2 */ ],

  "contested": false,           // true if usage is genuinely disputed
  "contested_note": null,       // required when contested === true

  "phonetic_changes": ["sokuon"],           // controlled vocab, §6
  "phonetic_change_detail": "ガク + コウ → がっこう",

  "difficulty": 1,              // integer 1–4, §5
  "difficulty_rationale": "Universal anchor — every learner knows this word.",

  "real_world_context": "School, education, universally common.",
  "trap_note": null,            // null when there is no trap, not ""

  "chains": ["学", "校"],        // characters whose chain this belongs to, §5
  "tags": []                    // free-form, §8
}
```

### 2.1 `characters[]`

One object per kanji in `compound`, in order.

```jsonc
{
  "kanji": "学",                    // exactly one character
  "reading_in_compound": "がっ",     // may be null on jukujikun components, see below
  "reading_type": "on",             // "on" | "kun" | "neither"
  "on_readings": ["ガク"],           // katakana, dictionary forms, may be []
  "kun_readings": ["まなぶ"],        // hiragana, dictionary forms, may be []
  "reading_note": "ガク → がっ via 促音 before こ"   // null when unremarkable
}
```

`on_readings` and `kun_readings` are the character's readings *in general*, not
in this compound. An empty array is meaningful: 畑 is a 国字 with no on reading,
茶 was imported with its concept and has no standard kun reading. Those empties
are the reason 茶畑 can only be 重箱, which is a real prediction tool. Do not
"fix" empty arrays by filling them.

`reading_in_compound` on 熟字訓 components **may** be null or may carry the
source's split of the whole-word reading across the characters (大人 → おと +
な). Preserve whatever the source has; do not null it and do not invent a split.
The prototype's `—` maps to null.

`reading_type` is `"neither"` only for components of a 熟字訓, where the reading
attaches to the whole word and no per-character assignment is honest. **This is
the literal token the source batches use** — verified by parsing recovered batch
1. Do not rename it to `"irregular"`; that value is reserved for nothing and
would collide conceptually with the retired `irregular` classification (§3).

### 2.2 `alternate_readings[]`

```jsonc
{
  "reading": "まいげつ",
  "classification": "on_on",        // may differ from the primary!
  "context": "More formal. Written and business contexts.",
  "status": "standard",             // enum, §7.3, mapped from source_status
  "source_status": "standard"       // the source's free-text status, verbatim, §7.3
}
```

Present on some source entries and absent on most. Absent means "no documented
alternates," not "none exist."

An alternate that changes the classification (毎月: まいつき is 重箱, まいげつ is
音音) is one of the most pedagogically useful shapes in the dataset. The UI must
be able to show both without implying one is an error.

---

## 3. Classification enum

Code values are ASCII. Display values are Japanese. Keep the mapping in exactly
one module.

| Code | Display | Structure | Decomposable |
|---|---|---|---|
| `on_on` | 音音 | on + on | yes |
| `kun_kun` | 訓訓 | kun + kun | yes |
| `juubako` | 重箱 | on + kun | yes |
| `yutou` | 湯桶 | kun + on | yes |
| `jukujikun` | 熟字訓 | whole-word, irregular | no |

The source schema also permitted a sixth value, `irregular`, and the index
counts two entries under "Irregular/3-char." **Do not carry `irregular` into the
canonical enum.** During consolidation, classify each such entry explicitly and
record the decision in the migration report. If an entry genuinely resists all
five categories, tag it `unclassifiable` in `tags[]`, set `classification` to
the closest fit, and flag it for Dan.

The source holds **four** entries outside the five categories (audited
2026-09-06: three `irregular`, one `n/a`), and consolidation handles them exactly
so:

- **真っ赤** (source reading types: 真 まっ kun, 赤 か on) — `classification`
  is set to the value the source's own reading types derive to (`yutou`),
  `tags` gains `unclassifiable`, and the entry is flagged in
  `reports/02-flagged.md` with the source reading types shown. か is not a
  dictionary on reading of 赤 (セキ, シャク), which is the reason the entry
  resists.
- **真っ青** (source: 真 まっ kun, 青 さお kun) — derives to `kun_kun`, tagged
  `unclassifiable`, flagged.
- **朝寝坊** (`char_count: 3`; source: 朝 あさ kun, 寝 ね kun, 坊 ぼう on) —
  `classification` is the two-character derivation applied to the first two
  characters (`kun_kun`), tagged `unclassifiable`, flagged.
- **峠** (source `n/a`; a single kanji, 国字) is **kept, not dropped**:
  `char_count: 1`, `classification: "kun_kun"` as the closest fit, tags
  `kokuji` and `unclassifiable`, excluded from derivation by the `char_count`
  rule below, flagged.

Drills in Phase 1 exclude entries tagged `unclassifiable`.

Three-character compounds (一段落 and similar) get `char_count: 3` and an
asserted classification. Derivation (§7.2) applies only when `char_count === 2`.

---

## 4. Mapping rules from existing schemas

### 4.1 Verbose (batch files) → canonical

The verbose schema is the primary source. Every entry in every batch becomes
exactly one canonical entry.

| Verbose field | Canonical field | Transform |
|---|---|---|
| `id` | `source_id` | verbatim |
| — | `id` | assign `cr_NNNN`, §4.3 |
| — | `source_batch` | from filename |
| `compound` | `compound` | verbatim |
| `reading` | `reading` | verbatim, normalize to NFC |
| — | `char_count` | count kanji in `compound` (kanji only, §7.1) |
| — | `has_kana` | true iff `compound` contains any kana |
| `classification` | `classification` | map `irregular` per §3 |
| — | `decomposable` | `classification !== "jukujikun"` |
| `characters[]` | `characters[]` | field names identical; `reading_type` values `on`/`kun`/`neither` pass through unchanged |
| `alternate_readings[]` | `alternate_readings[]` | verbatim if present, `[]` if absent |
| — | `contested` | true iff any alternate has status `variant_accepted`, `variant_spreading`, or `disputed`; also true for the eight entries in §7.4 |
| `phonetic_changes[]` | `phonetic_changes[]` | normalize vocabulary, §6 |
| `phonetic_change_detail` | same | verbatim |
| `difficulty` | same | verbatim, validate 1–4 |
| `difficulty_rationale` | same | verbatim |
| `real_world_context` | same | verbatim |
| `trap_note` | same | verbatim; `""` → `null` |
| — | `chains[]` | §5, requires extraction |
| — | `tags[]` | `[]` |

Any verbose field not in this table is an unexpected field. Do not drop it
silently — log it in the migration report with a count and let Dan decide.

### 4.2 Compact (prototype) → canonical

**The compact entries are not a source of entries.** They are a subset (~45)
of compounds that also exist in the batch files, re-encoded for the prototype.
Their only unique contribution is `chains[]`.

Match compact to canonical on `compound` + `reading`, **not** on `id` — the ID
namespaces are unrelated (`jb06` in compact is 茶畑, which is `juubako_16` in
verbose). For each match, merge `chains[]` into the canonical entry.

Handle the exceptions explicitly:

- **Compact entry with no verbose match** — either a prototype-only entry or a
  transcription difference. Report it; do not auto-insert.
- **Compact and verbose disagree on `cls`** — verbose wins by default, but log
  every disagreement. These are exactly where a real error is likely to be.
  **Confirmed instance:** 場所. Verbose `yutou_05` has 場 = ば `kun`, classification
  `yutou`. Compact `yt01` has 場 = ば `on`, classification `on_on`. Verbose is
  correct; the compact entry and its trap note must both be discarded, not merged.
- **Compact `changes` uses Japanese tokens** where verbose uses English — see
  §6. Normalize both.

Compact field mapping, for reference: `chars[].k` → `kanji`, `.r` →
`reading_in_compound`, `.t` → `reading_type`, `cls` → `classification`, `diff` →
`difficulty`, `changes` → `phonetic_changes`, `changeDetail` →
`phonetic_change_detail`, `context` → `real_world_context`, `trap` →
`trap_note`.

### 4.3 Canonical ID assignment

Source IDs are unusable as canonical IDs for two reasons, both confirmed:

1. Prefixes do not match classification. 値段 is `juubako_56` but classifies as
   湯桶; 台風 is `juubako_25` but classifies as 音音; 夕暮れ is `yutou_24` but
   classifies as 訓訓. Anyone — human or machine — who reads meaning into the
   prefix will be wrong.
2. Numbering restarted across batches (batch 3's highest `juubako_` number is
   24; batch 4 opens at `juubako_25`), yet the audit found **0 duplicate IDs
   across the 168 entries** (`reports/00-audit.md` §2.1). Canonical IDs are
   still reassigned because 45 of 168 prefixes contradict the entry's
   classification (audit §2.2).

Canonical IDs are therefore **opaque and sequential**: `cr_0001` through
`cr_NNNN`, assigned in a deterministic order (source batch, then source file
order) so that re-running consolidation produces identical IDs. Opaque means
opaque — no code may parse an ID for meaning.

`source_id` and `source_batch` are preserved so any entry can be traced back.

### 4.4 Canonical → compact (build transform)

Generated by `scripts/build-compact.ts`. Emits `id` (the canonical `cr_NNNN`),
`compound`, `reading`, `chars[] {k, r, t}`, `cls`, `diff`, `changes`,
`changeDetail`, `context`, `trap`, `chains[]`, plus `alternates[]` where present
— the prototype's schema had no slot for alternates, and dropping them would
break contested-reading display, which is a design principle.

Round-trip test: for every generated compact entry, each field must equal the
canonical field it derives from. This is a cheap test that catches transform
drift immediately.

---

## 5. Chains

A chain is the set of entries sharing one kanji, used to show how classification
shifts with the partner character. Chains are the core teaching device — see
`CLAUDE.md` §5.

### 5.1 Entry-level

`chains[]` is an array of single-kanji strings. An entry belongs to a chain for
a character if it contains that character *and* the chain is one we teach.

Membership is derivable from `compound` in principle, but not every character
that appears twice makes a chain. `data/chains.json` is the whitelist; an entry's
`chains[]` contains only characters present in that whitelist.

### 5.2 Chain-level — `data/chains.json`

```jsonc
{
  "character": "手",
  "display_order": 1,
  "rule": "手 is て (kun) throughout. Classification is determined entirely by the second character: on → 湯桶, kun → 訓訓.",
  "rule_reliability": "clean",     // "clean" | "usually" | "none"
  "teaching_note": "Best entry point. The rule is statable in one sentence and holds across all entries.",
  "entry_order": ["cr_0042", "cr_0043", "cr_0044", "cr_0091"]
}
```

`entry_order` is the pedagogical sequence, not alphabetical or ID order. Chain
Explorer walks it in this order.

`rule_reliability` matters: `"clean"` (手, 夕, 毎) means the rule holds across
every entry. `"usually"` (目 and the concrete/abstract split generally) means it
holds with documented exceptions. `"none"` means the character has multiple
entries but no statable rule — those are not chains and should not be presented
as lessons. **A character with two or three entries and no rule is a list, not a
chain.** Set a minimum bar and let the rest be ordinary entries.

### 5.3 Extraction — the hard part

Chain data currently lives in three places:

1. `chains[]` on the ~45 compact prototype entries — structured, directly usable
2. Chain maps in `compound_readings_index.md` — semi-structured, covers batches
   1–3 only
3. Prose trap notes on verbose entries — unstructured English, e.g. *"目 chain:
   め(kun) in 目印/目玉/目安 (all concrete/practical), モク(on) in 目標
   (abstract/strategic)"*

Source 3 is the largest and cannot be parsed reliably. The extraction procedure
is: build the union of sources 1 and 2 automatically, scan trap notes for the
literal string `chain` to surface candidates, then produce a proposed
`chains.json` for Dan to review before committing. Do not commit auto-extracted
chain assignments unreviewed.

Chains named in `CLAUDE.md` §5 must all survive extraction. If one is missing
from the output, the extraction is wrong, not the source.

---

## 6. Phonetic changes — controlled vocabulary

Two vocabularies exist in the sources: English tokens in the verbose batches
(`"rendaku"`, `"sokuon"`), Japanese in the compact prototype (`"連濁"`). Both
normalize to the ASCII code below.

| Code | Display | Description | Example |
|---|---|---|---|
| `rendaku` | 連濁 | Sequential voicing of the second element's initial | はたけ → ばたけ (茶畑) |
| `sokuon` | 促音 | Gemination; final ク/ツ before カ/サ/タ行 | ガク+コウ → がっこう |
| `handakuon` | 半濁音化 | ン + ハ行 → パ行 | さん+ほ → さんぽ |
| `long_vowel` | 長音化 | Vowel lengthening | — |
| `vowel_change` | 母音変化 | Vowel alternation not covered above | — |
| `other` | その他 | Anything else; `phonetic_change_detail` required | — |

Spellings actually present in the source files (audited 2026-09-06): the verbose
batches use `rendaku`, `sokuon` and `other` (the four 半濁音化 entries are filed
under `other`); the prototype uses `連濁`, `促音` and `半濁音`. `半濁音` maps to
`handakuon`.

`phonetic_changes` is an array — an entry may undergo more than one. Empty array
means no change, and that assertion is checkable (§7.5).

### Known complete cluster

半濁音化 has exactly four entries: 散歩, 年俸, 心配, 乾杯. Completeness is
pedagogically valuable — the pattern is fully learnable in one sitting. If
validation finds a fifth, that is interesting and should be reported, not
silently accepted.

連濁 is the largest cluster: 24 entries carry the token (audited 2026-09-06).
促音 has 9: 学校, 早速, 約款, 切手, 物質, 真っ赤, 真っ白, 真っ黒, 真っ青.

The four 半濁音化 entries (散歩, 年俸, 心配, 乾杯) arrive from source under the
token `other` with 半濁音化 named only in `phonetic_change_detail`; consolidation
promotes them to `handakuon` and lists the promotion in the migration report.

Note the edge case in 勝負 (しょうぶ): 負 フ → ぶ is voicing between two *on*
readings, which is arguably not 連濁 in the strict sense. The source entry
discusses this in a `reading_note` while leaving `phonetic_changes` empty. Use
`other` with a detail note rather than forcing it into `rendaku`.

---

## 7. Validation rules

`scripts/validate.ts`. Any ERROR fails the build. WARN is reported and does not.

### 7.1 Structural — ERROR

- Every entry conforms to the Zod schema
- `id` unique across the dataset
- `source_id` + `source_batch` unique in combination
- `characters.length === char_count`
- `char_count` equals the count of kanji in `compound` — **kanji only**; kana
  inside the compound are not counted
- Each `characters[].kanji` is exactly one character, and concatenating them
  equals `compound` **with its kana removed**. The concatenation rule and
  `char_count` compare kanji only. `compound` keeps its kana as written
  (気持ち, 揚げ物, 追い風, 真っ赤, 真っ白, 真っ黒, 真っ青, 枠組み, 夕暮れ, 音読み,
  訓読み), and `has_kana` is true on exactly the entries whose `compound`
  contains kana
- `reading` is hiragana only
- `on_readings` entries are katakana; `kun_readings` entries are hiragana
- `difficulty` is an integer 1–4
- Required non-null: `compound`, `reading`, `classification`, `characters`,
  `difficulty`, `difficulty_rationale`, `real_world_context`

### 7.2 Classification derivation — ERROR

For `char_count === 2` and `classification !== "jukujikun"`, the classification
must equal the derivation from the two `reading_type` values:

| char 1 | char 2 | ⇒ |
|---|---|---|
| on | on | `on_on` |
| kun | kun | `kun_kun` |
| on | kun | `juubako` |
| kun | on | `yutou` |

A mismatch is an ERROR. This is the single most valuable check in the suite —
it is what would have caught the ID/classification confusion at generation time.

Exceptions, checked separately:

- `jukujikun` — excluded from derivation. Instead verify every
  `characters[].reading_type === "neither"`. WARN if a 熟字訓 entry has per-character readings, since that usually
  means it was misclassified.
- `char_count > 2` — excluded from derivation, WARN for manual review.
- `reading_type === "neither"` on a non-熟字訓 entry — ERROR.

### 7.3 Alternate readings — ERROR on enum, WARN otherwise

`status` enum:

| Value | Meaning |
|---|---|
| `standard` | Both forms fully standard, often register-split |
| `variant_accepted` | Variant is widely accepted, dictionaries permit both |
| `variant_spreading` | Variant is gaining ground, not yet fully accepted |
| `prescriptive_only` | Form prescribed but rare in actual use |
| `disputed` | Native speakers actively disagree |
| `nonstandard` | Common error; recorded to be recognized, not accepted |

The source batches carry `status` as free text (14 distinct strings, audited
2026-09-06), not this enum. Each alternate therefore also carries
`source_status: string`, the source's text verbatim, and `status` is mapped from
it by this rule table, applied in order, first match wins:

| Source string | → `status` |
|---|---|
| begins with "standard" | `standard` |
| contains "NHC changed", "NHK changed", "increasingly accepted", or "permit" | `variant_accepted` |
| contains "widespread but contested" or "originally non-standard" | `variant_spreading` |
| contains "domain-specific" | `standard` |
| anything unmatched | `disputed` **and** a row in the migration report |

Every distinct source string and the enum it mapped to is a row in
`reports/01-migration.md`.

WARN if `alternate_readings[].classification` differs from the entry's
`classification` and no `trap_note` mentions it — a classification-changing
alternate is exactly the kind of thing the entry should be teaching.

Grading in the app accepts the primary reading plus every alternate whose status
is not `nonstandard`.

### 7.4 Contested readings — ERROR

`contested === true` requires a non-null `contested_note`. The following eight
compounds must be present with `contested: true`; their absence after
consolidation means data was lost:

| Compound | Prescriptive | Variant | Note |
|---|---|---|---|
| 貼付 | ちょうふ | てんぷ | Both widely accepted |
| 施行 | しこう | せこう | Semantic split: law vs construction |
| 代替 | だいたい | だいがえ | Spreading; disambiguates from 大体 |
| 重複 | ちょうふく | じゅうふく | NHK permits both |
| 依存 | いそん | いぞん | NHK changed its guidance in 2014 |
| 続柄 | つづきがら | ぞくがら | Variant dominant in speech |
| 遊説 | ゆうぜい | ゆうせつ | Native speakers commonly err |
| 一段落 | いちだんらく | ひとだんらく | Widespread variant |

### 7.5 Phonetic-change consistency — WARN

If a character's `reading_in_compound` appears in neither its `on_readings` nor
its `kun_readings` (after kana normalization), the entry should list a phonetic
change. An empty `phonetic_changes` in that situation is a WARN. This catches
勝負-type omissions.

**Stem rule.** A `reading_in_compound` matches a kun reading if it equals it
**or** equals that reading with its trailing okurigana removed — the 連用形 stem
of a verb recorded in dictionary form: 消印 けし ← けす, 続柄 つづき ← つづく,
受付 つけ ← つける, 音読み よみ ← よむ. Concretely, for a kun reading ending in
る whose preceding kana is in the i- or e-row, the stem is the reading without
る (つける → つけ); for any other kun reading ending in a u-row kana, the stem
is the reading with that final kana shifted to the i-row (けす → けし, つづく →
つづき, よむ → よみ). Nothing else is matched: あら does not match あらた, so
新手 stays flagged. After the stem rule the omission check flags 勝負 and 新手
only; if it flags more, the validator lists them and the rule is not widened.

Conversely, a listed phonetic change with a `reading_in_compound` that exactly
matches a dictionary reading is also a WARN.

### 7.6 Chains — WARN

- Every character in `chains[]` appears in `compound`
- Every character in `chains[]` exists in `data/chains.json`
- Every `entry_order` ID in `chains.json` resolves to a real entry
- Every entry containing a whitelisted chain character has that character in its
  `chains[]` — catches entries missed during extraction
- A chain with `rule_reliability: "clean"` where entries contradict the stated
  rule — flag loudly; a clean rule with an exception is a content bug

### 7.7 Coverage reporting — informational

Not pass/fail, but printed on every run so drift is visible:

- Entry count by classification, with the imbalance called out
- Entry count by difficulty
- Entry count by phonetic change
- Chain sizes
- Count of entries with alternates, with traps, with contested flags
- Entries reachable in zero chains

---

### 7.8 Documentation anchor assertions — ERROR

Every anchor example asserted in prose in `CLAUDE.md` (§2's five-category table,
§5's chain rules, §6's defect list) must also exist as a machine-checked fixture
in `scripts/anchors.json`:

```jsonc
[
  { "compound": "場所", "reading": "ばしょ", "classification": "yutou",
    "asserted_in": "CLAUDE.md §2", "note": "signature trap" },
  { "compound": "手本", "reading": "てほん", "classification": "yutou",
    "asserted_in": "CLAUDE.md §5", "note": "手 chain" },
  { "compound": "夕食", "reading": "ゆうしょく", "classification": "yutou",
    "asserted_in": "CLAUDE.md §5", "note": "夕 chain; the prototype's 重箱 and its trap text are wrong" },
  { "compound": "夕飯", "reading": "ゆうはん", "classification": "yutou",
    "asserted_in": "CLAUDE.md §5", "note": "夕 chain; the prototype's 重箱 is wrong" }
]
```

The 夕食 and 夕飯 fixtures exist because the prototype records both as 重箱 and
its 夕食 trap text says so too; the source (batch 3) records both as 湯桶 with 夕
= ゆう kun, and the source is right.

`validate.ts` checks every fixture against `data/compounds.json` and **fails the
build on any mismatch**.

**Why this rule exists.** The first draft of `CLAUDE.md` asserted that 場所 is
音音 and that ば is a contracted on reading. That claim came from the compact
prototype, which is wrong; the verbose source says 湯桶 with ば as kun. The prose
claim and the data disagreed for an entire document revision and nothing caught
it, because prose is not executable. Anchor assertions make the docs falsifiable
by the same script that validates the data. Any future prose claim about a
specific entry must be added here or it does not belong in the docs.

Applies to statements about *specific entries*. General pedagogical claims (the
semantic heuristic, the leakiness of the meal matrix) are not fixtures.

---

## 8. `tags[]`

Free-form array for cross-cutting groupings that are not chains, classifications,
or phonetic changes. Suggested initial values, to be applied only where the
source data already supports them:

`kokuji` (国字 — structurally constrains classification), `meta` (self-referential
entries like 音読み), `meal_matrix` (the 朝食/朝飯/夕食/夕飯 set), `number`,
`color`, `keigo_adjacent`, `place_name`, `counter`, `unclassifiable`.

Tags are additive and cheap. Do not invent tag values during consolidation
beyond what the source entries clearly support — a tag applied by guess is worse
than no tag.

---

## 9. Versioning

`data/compounds.json` carries `"$schema_version": "1.0.0"`.

Bump minor for additive fields, major for anything that breaks a consumer.
The localStorage wrapper stores the schema version alongside progress data; on
mismatch it migrates or resets rather than reading stale shapes.

Progress data in `localStorage` is stored under a key that includes a user
identifier (`cr:<userId>:progress:v<schema>`), and exported progress JSON carries
that `userId`; the dataset itself is shared and carries no user key.
