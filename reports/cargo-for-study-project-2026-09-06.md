# Cargo — Compound Readings dataset questions — 2026-09-06

From the Compound Readings software project (repository `isleofdan/compound-readings`, Session 3) to Dan's Japanese-study project. This document is self-contained: every question below carries the entry, what the data says today, the question, and the software session's recommended answer. Nothing here has been applied to the data. The software project owns the code; the dataset content and the pedagogy are the study project's to rule on.

Dataset state: `data/compounds.json`, 168 entries, schema 1.0.0; `npm run validate` reports 0 ERRORs and 17 WARNs. Canonical IDs (`cr_NNNN`) are opaque and are given only so an answer can name an entry unambiguously.

---

## (a) The 17 validator WARNs

### a.1 — Phonetic-change token listed, but the reading in the compound is itself a listed dictionary reading (3)

The validator raises this when an entry lists a phonetic change and yet every character's `reading_in_compound` matches one of its own `on_readings` / `kun_readings` exactly. Either the reading list already contains the changed form, or the token is redundant. The two views are inconsistent with each other and the data currently holds both.

| WARN | Entry | What the data says |
|---|---|---|
| 12 | cr_0006 早速 さっそく (音音) | `phonetic_changes: ["sokuon"]`, detail "ソウ + ソク → さっそく (促音 assimilation)". 早's `on_readings` are `["ソウ", "サッ"]`; reading_note: "サッ is a variant on reading (promoted 促音 form)." |
| 13 | cr_0025 雨具 あまぐ (湯桶) | `phonetic_changes: ["rendaku"]`, detail "グ is technically the standard on reading (already voiced), but the voicing reinforces the compound boundary." 具's `on_readings` are `["グ"]` — the only on reading is already voiced. |
| 15 | cr_0142 縁側 えんがわ (重箱) | `phonetic_changes: ["rendaku"]`, detail "かわ → がわ (連濁)". 側's `kun_readings` are `["かわ", "がわ", "そば"]` — the voiced form is itself listed. |

**Question.** For each: is the changed form a dictionary reading of the character (in which case the token is describing nothing), or is it the product of a phonetic change (in which case it should not be in the character's reading list)?

**Recommended answer.** Decide one rule and apply it to all three: *a phonetic-change token records a change from a listed reading; the changed form is not itself listed.* Under that rule: 早速 — remove `サッ` from 早's `on_readings` (the token and its detail then explain さっ); 縁側 — remove `がわ` from 側's `kun_readings`; 雨具 — remove the `rendaku` token and keep the explanation in the reading_note, because there is no unvoiced form to change from. Consequence to carry into the docs: the 連濁 count `CLAUDE.md` §5 states (24) becomes 23, and the 促音 list is unchanged. If the study project prefers the opposite rule (the reading lists are authoritative, tokens are commentary), say so and the software project relaxes the validator check instead.

### a.2 — 熟字訓 entries with per-character reading types (3)

`DATA_SPEC.md` §2.1: `reading_type` is `"neither"` only for components of a 熟字訓, "where the reading attaches to the whole word and no per-character assignment is honest." These three 熟字訓 entries give one character a real reading type.

| WARN | Entry | What the data says |
|---|---|---|
| 1 | cr_0073 果物 くだもの | 果 くだ `neither`; 物 もの `kun`. Trap note: "You can't partially decompose." |
| 4 | cr_0150 一人 ひとり | 一 ひと `kun` (note: "ひと is standard kun of 一. So this may be classifiable as 訓訓 rather than 熟字訓."); 人 り `neither`. |
| 5 | cr_0151 二人 ふたり | 二 ふた `kun`; 人 り `neither`. |

**Question.** Is a 熟字訓 whose first character *does* carry its regular reading still a 熟字訓 with both characters `neither`, or is "partially decomposable" a state the data should record?

**Recommended answer.** Keep the classification 熟字訓 and set every character of a 熟字訓 to `neither`, as the spec rule says — the entries' own trap notes argue that partial decomposition is not a category. The information that 物=もの and 一=ひと are regular readings is already in the reading_note text and stays visible there. (Alternative, if the partial case is worth teaching as its own thing: keep the mixed types and add a `partial_jukujikun` tag, and the validator rule is narrowed to exclude tagged entries.)

### a.3 — The 手 chain's clean rule contradicted by 手段 (1)

| WARN | Entry | What the data says |
|---|---|---|
| 17 | chain 手 / cr_0111 手段 しゅだん (音音) | `data/chains.json` gives 手 `rule_reliability: "clean"` with the rule "手 is て (kun) throughout; classification is determined entirely by the second character…". 手段 has 手 = シュ `on`. Its trap note calls it the "手 chain culmination … Six entries as て(kun), one as シュ(on)." |

**Decided by the Session 3 brief (software side, already applied):** the chain stays `clean`, 手段 is placed last in `entry_order` and marked in an `exceptions` list, and Chain Explorer shows it as the exception after the rule. The rule *text* was not changed, because wording the rule is pedagogy.

**Question.** Should the rule text acknowledge the exception (e.g. "手 is て (kun) in every entry but 手段; when it is て, the partner decides: on → 湯桶, kun → 訓訓"), or stay as it is and let the exception card do the work?

**Recommended answer.** Reword to name the exception. Until the text or the membership changes, the validator keeps raising WARN 17 on every run by design.

### a.4 — The rest (10)

| WARN | Entry | What the data says | Question | Recommended answer |
|---|---|---|---|---|
| 2 | cr_0106 一段落 いちだんらく | 3 kanji, asserted 音音; reading types on, on, on. Manual-review WARN for every three-character compound. | Confirm 音音 as the asserted classification. | Confirm. (The alternate ひとだんらく → 湯桶 by the same first-two-characters rule as 朝寝坊 was accepted by the Session 3 brief.) |
| 3 | cr_0124 朝寝坊 あさねぼう | 3 kanji, asserted 訓訓; reading types kun, kun, on. Also one of the four outliers in (b). | Confirm 訓訓 as the closest fit while tagged `unclassifiable`. | Confirm; see (b). |
| 6 | cr_0082 毎年 まいとし (重箱) | Alternate まいねん is 音音; the trap note does not mention まいねん (the reading_note on 年 does). | Should the trap note name the classification-changing alternate? | Yes — add one sentence to the trap note naming まいねん. The rule exists because a classification-changing alternate is the most useful shape in the dataset and the trap note is what the app shows on reveal. |
| 7 | cr_0103 生花 いけばな (訓訓) | Alternate せいか is 音音, "different meaning" (fresh flowers vs. the art form). Trap note does not mention せいか. | Same. | Same — one sentence. |
| 8 | cr_0120 二十歳 はたち (熟字訓) | Alternate にじっさい is 音音; trap note does not mention it. | Same. | Same. |
| 9 | cr_0150 一人 ひとり (熟字訓) | Alternate いちにん is 音音; trap note does not mention it. | Same. | Same. |
| 10 | cr_0151 二人 ふたり (熟字訓) | Alternate ににん is 音音; trap note does not mention it. | Same. | Same. |
| 11 | cr_0153 初日 しょにち (音音) | Alternate はつひ is 訓訓 (初日の出); trap note does not mention it. | Same. | Same. |
| 14 | cr_0101 新手 あらて (訓訓) | 新 = あら matches none of 新's readings (on シン; kun あたらしい・あらた・にい); `phonetic_changes` is empty. reading_note: "あら is an older/literary kun reading form of 新. Shortened from あらた." | Is あら a reading of 新 (add it to `kun_readings`) or a change from あらた (add a phonetic-change token)? | Add `other` with detail "あらた → あら, older/literary shortened form" — the same shape `DATA_SPEC.md` §6 prescribes for 勝負. |
| 16 | cr_0165 勝負 しょうぶ (音音) | 負 = ぶ; on フ; `phonetic_changes` empty. reading_note: "フ → ぶ (voicing). This is sequential voicing, not 連濁 strictly — it occurs between two on readings." `CLAUDE.md` §6.6 asks the validator to flag exactly this; `DATA_SPEC.md` §6 says the eventual fix is `other` with a detail note. | Apply the fix the spec already names? | Yes — `phonetic_changes: ["other"]`, detail "フ → ぶ, voicing between two on readings (not 連濁 in the strict sense)". |

---

## (b) The four entries outside the five categories

All four are tagged `unclassifiable`, carry the closest-fit classification, are shown in Browse and in any chain they belong to, and are excluded from the drills (Phase 1).

| Entry | Source classification | Source reading types | Canonical classification | Why it resists |
|---|---|---|---|---|
| cr_0135 真っ赤 まっか | `irregular` | 真 まっ kun, 赤 か on | 湯桶 (the derivation of the source's own types) | **か is not a dictionary on reading of 赤** — 赤's on readings are セキ and シャク; the source marks か `on` and its own reading_note doubts it ("Wait — is か on or kun here? Actually, か is NOT a standard reading of 赤 … arguably a special intensifier form"). The detail field says the same. |
| cr_0138 真っ青 まっさお | `irregular` | 真 まっ kun, 青 さお kun | 訓訓 | さお is not a standard reading of 青 (kun あお); the source calls it "an archaic/dialectal form surviving in this compound." |
| cr_0124 朝寝坊 あさねぼう | `irregular` | 朝 あさ kun, 寝 ね kun, 坊 ぼう on | 訓訓 (first two characters) | Three characters, kun + kun + on; "no clean label in the four-category system" (trap note). |
| cr_0156 峠 とうげ | `n/a` | 峠 とうげ kun | 訓訓 (closest fit) | A single kanji, a 国字 with only a kun reading; not a compound. Kept as the 国字 structural-constraint reference (tag `kokuji`). |

**Question.** (1) Do the four stay in the dataset as they are — visible, tagged, drill-excluded? (2) Is the 真っ+color set (真っ赤, 真っ青, 真っ白, 真っ黒) its own morphological category, as both 真っ赤 and 真っ青 trap notes suggest, and if so should 真っ白 and 真っ黒 (currently plain 訓訓) share a tag with them?

**Recommended answer.** (1) Yes, unchanged. (2) Tag all six color entries `color` (see (f)) and keep the individual classifications as the closest fit; the app can then present the set as a unit without inventing a sixth classification.

---

## (c) The 16 prose fields with self-correction markers, verbatim (11 entries)

The validator lists every field matching *wait / actually / hmm / correction / rethink*. Only 音読み (CLAUDE.md §6.5) has been rewritten; these are untouched. The full field text follows so the study project can rule without opening the dataset.

**cr_0033 凡例 はんれい — `trap_note`**
> ぼんれい is the most common misreading. The ハン reading of 凡 is essentially a fossil surviving in this word and 凡庸(はんよう... wait, that's actually ぼんよう). Actually 凡例 is one of very few places ハン survives as a standard reading.

**cr_0038 世論 せろん — `trap_note`**
> せろん is 音音, よろん is 湯桶. Same kanji, different classification depending on reading. This is a rare case where the dual reading actually changes the compound's category. Historical footnote: よろん was originally 輿論 — the reading survived a kanji substitution.

**cr_0052 楽屋 がくや — `real_world_context`**
> Theater, TV, events — '楽屋でお待ちください' (please wait backstage). Also figurative: '楽屋裏' (behind the scenes).

**cr_0084 雨量 うりょう — `characters[0].reading_note` (雨)**
> Wait — ウ is the ON reading of 雨. This makes the classification 音音, not 湯桶.

**cr_0102 割引 わりびき — `trap_note`**
> 引 appears in both 取引(とりひき, no 連濁) and 割引(わりびき, 連濁). Why does 連濁 apply in one but not the other? This is actually irregular — both are verb+verb compounds but 連濁 behaves inconsistently. Honest acknowledgment of where the rules get messy.

**cr_0112 番地 ばんち — `difficulty_rationale`**
> Common address vocabulary. 地=チ vs ジ is a useful disambiguation: チ for 'ground/land' (番地, 土地, 地方), ジ for 'texture/quality/ground-base' (生地, 地元... wait, 地元=じもと uses ジ but means 'local'). The split isn't perfectly semantic.

**cr_0135 真っ赤 まっか — `difficulty_rationale`**
> Looks simple but is actually a classification problem. 赤=か doesn't fit neatly as on or kun. The 真っ+color pattern may be its own morphological category.

**cr_0135 真っ赤 まっか — `characters[1].reading_note` (赤)**
> Wait — is か on or kun here? Actually, か is NOT a standard reading of 赤. The standard on readings are セキ and シャク. This is arguably a special intensifier form.

**cr_0139 革靴 かわぐつ — `trap_note`**
> I initially misclassified this — mistaking ぐつ for an on reading when it's actually くつ(kun) with 連濁. Catching self-corrections like this during data entry demonstrates exactly the value of careful character-by-character verification. 靴 on reading is カ (as in 軍靴=ぐんか), not くつ.

**cr_0139 革靴 かわぐつ — `characters[1].reading_note` (靴)**
> Wait — くつ is the KUN reading of 靴. ぐつ is くつ with 連濁. So this is kun, not on. That makes this 訓訓, not 湯桶.

**cr_0146 灰色 はいいろ — `trap_note`**
> 灰=はい(kun) vs 茶=チャ(on): both 'feel' similarly Sino-Japanese to many learners, but 灰 has a kun reading はい while 茶 has no kun reading at all. This is the same trap as 場=ば — short readings that feel like on but are actually kun.

**cr_0146 灰色 はいいろ — `characters[0].reading_note` (灰)**
> Actually, はい is the KUN reading of 灰. On reading is カイ. So this is 訓訓, not 重箱.

**cr_0152 初耳 はつみみ — `trap_note`**
> 初=はつ is KUN despite appearing in many compounds that feel Sino-Japanese. Proof: 初 on reading is ショ (as in 初回=しょかい, 初期=しょき). When 初=はつ, it's always kun. This is another entry in the 'short readings ≠ automatically on' pattern: 場=ば, 気=キ(actually IS on), 初=はつ(kun), 灰=はい(kun).

**cr_0152 初耳 はつみみ — `difficulty_rationale`**
> Classification trap. はつ feels like an on reading (short, common in formal compounds: 初回, 初日) but is actually kun. Same trap as 場=ば.

**cr_0152 初耳 はつみみ — `characters[0].reading_note` (初)**
> Actually, はつ is KUN not on. 初 on reading is ショ. So this is 訓訓, not 重箱.

**cr_0168 訓読み くんよみ — `difficulty_rationale`**
> Another meta entry. 訓読み (the word for kun-reading) is actually 重箱読み (on+kun), not 訓訓 as you might expect.

**Question.** Which of these are reasoning-in-progress to be rewritten cleanly (as 音読み was), and which are the pedagogy?

**Recommended answer.** Three groups.
- *Rewrite (mid-thought reasoning visible in a data field the app shows):* 凡例 trap_note ("凡庸(はんよう... wait, that's actually ぼんよう)"); 番地 difficulty_rationale ("地元... wait"); the five reading_notes that open with "Wait —" or "Actually," — 雨量 雨, 真っ赤 赤, 革靴 靴, 灰色 灰, 初耳 初. Each should state its conclusion directly; the conclusions themselves are already reflected in the classification fields.
- *Keep (the self-correction is the lesson):* 革靴 trap_note ("I initially misclassified this…" is the point of the entry); 割引, 世論, 灰色 trap_note, 初耳 trap_note and difficulty_rationale, 真っ赤 difficulty_rationale, 訓読み difficulty_rationale — "actually" is used rhetorically, not as a correction.
- *False positive (no change):* 楽屋 real_world_context ("please wait backstage").

---

## (d) The 目 chain has no entries

`CLAUDE.md` §5 describes the 目 chain as a semantic split — め (kun) in concrete/practical compounds, モク (on) in abstract/strategic ones — and names five compounds: **目印, 目玉, 目安, 目標, 目的**. §2 uses 目的 もくてき as a 音音 anchor. No entry in any of the four source batches contains 目; the chain row in `data/chains.json` has an empty `entry_order`, and Chain Explorer does not offer it. As of 2026-09-06 both `CLAUDE.md` sections say so.

**Question.** Does the study project author the five entries (in the batch schema, so consolidation can take them), and are those five the right five?

**Recommended answer.** Yes, and add at least one more per side so the split has three examples each (the chain needs three entries to count as a lesson; five gives three め and two モク). Deliver them as a batch 5 file in the source schema; the software project's consolidator, validator and Chain Explorer need no change to take them.

---

## (e) The three prototype-only compounds

The React prototype embeds 43 compact entries; 40 match a source entry on compound + reading. These three do not, and were not inserted (the prototype is not a source of entries, `DATA_SPEC.md` §4.2):

| Prototype ID | Compound | Reading | Prototype classification | Note |
|---|---|---|---|---|
| `on02` | 会議 | かいぎ | 音音 | — |
| `on05` | 毎日 | まいにち | 音音 | The one the 毎 chain misses: 毎月's trap note already lists 毎日 as part of the "now well-populated" 毎X system, but there is no 毎日 entry. |
| `kun08` | 若葉 | わかば | 訓訓 | — |

**Question.** Author them as source entries (batch 5) or leave them out?

**Recommended answer.** Author 毎日 (it completes the 毎 chain the data already describes as complete); leave 会議 and 若葉 out unless a chain needs them.

---

## (f) Candidate tags with their member lists — not applied

`DATA_SPEC.md` §8 allows tags only where the source data already supports them. The source prose supports the following; none has been applied (only `unclassifiable` on the four outliers and `kokuji` on 峠 exist today).

| Tag | Members | Support in the source |
|---|---|---|
| `kokuji` | 茶畑 (畑), 申込 (込), 辻褄 (辻), 枠組み (枠) — plus 峠, already tagged | Each entry's reading_note or trap_note names the character as a 国字 (kun only). |
| `meta` | 音読み, 訓読み | Both are self-referential meta-entries (`CLAUDE.md` §2). |
| `meal_matrix` | 朝食, 朝飯, 夕食, 夕飯 | The documented leak in the semantic heuristic (`CLAUDE.md` §5). |
| `color` | 真っ赤, 真っ青, 真っ白, 真っ黒, 茶色, 灰色 | The 真っ+color set named in the 真っ赤 and 真っ青 trap notes; 茶色 and 灰色 are the two other color compounds. |
| `number` | 一人, 二人, 一日, 一口, 一言, 二十歳 | Number-word 熟字訓 and counters; the 一人/二人 trap notes describe the counter boundary. |

**Question.** Approve the list as is, amend it, or hold?

**Recommended answer.** Approve all five. The software project applies them in consolidation as named patches with one migration-report row per tag; Browse can then offer them as a grouping (the 半濁音化-style "complete set" presentation `CLAUDE.md` §5 asks for).

---

Answers come back to the Compound Readings software project as a list of entry → decision; the next consolidation applies them with a migration row each.
