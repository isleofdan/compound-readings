# CLAUDE.md — Compound Readings Drill Tool

Read this file at the start of every session. It is the only context you have.
You have no access to the chat history, project memory, or design conversations
that produced this project. Everything you need is in this file, `BUILD_PLAN.md`,
`DATA_SPEC.md`, and the dataset files in `data/`.

---

## 1. What this is

A drill and reference web app that teaches advanced Japanese learners to
classify compound kanji readings systematically.

**The user is one person: Dan.** He is an advanced learner (N1-passed level) who
runs a consulting firm in Japan. He can read the material but hesitates on it in
the wild — menus, business documents, signage, place names. This tool is for
closing the gap between "I know this" and "I read it without stopping."

The first user is Dan, and design decisions are made for his profile below. The
app may later be offered to other N1+ learners. Therefore:
**no path, storage key, identifier, or data shape may assume there is only one user.**
Progress and state are keyed under a user identifier from the first line of
persistence code, even while that identifier is a single locally generated
value. Accounts, payments, sync, and multi-user storage are out of scope until
Dan says otherwise — this rule exists so they are never foreclosed, not so they
get built early. Do not add onboarding, accounts, or generic-audience
scaffolding.

### The learner profile that drives design decisions

- Has a large vocabulary and solid grammar. Does **not** need definitions,
  translations, or beginner scaffolding.
- Stumbles on *reading selection*, not meaning: knowing that 場 is ば here and
  じょう there, and why.
- Often guesses correctly and then second-guesses. A major function of this tool
  is confirming that a correct instinct was correct.
- Has experienced skill decay and wants maintenance, not a curriculum.
- Uses this in short sessions on a phone, initiated by him, on his own schedule.

---

## 2. The five-category framework

Japanese compounds are classified by which reading type each character takes.
On (音) readings derive from Chinese; kun (訓) readings are native Japanese.

| Category | Structure | Anchor examples |
|---|---|---|
| **音音** (on-on) | on + on | 学校 がっこう, 目的 もくてき, 台風 たいふう |
| **訓訓** (kun-kun) | kun + kun | 手紙 てがみ, 焼鳥 やきとり, 夕暮れ ゆうぐれ |
| **重箱** (juubako) | on + kun | 茶畑 ちゃばたけ, 毎朝 まいあさ, 番組 ばんぐみ |
| **湯桶** (yutou) | kun + on | 手本 てほん, 手帳 てちょう, 焼肉 やきにく |
| **熟字訓** (jukujikun) | irregular — reading maps to the whole word, not to characters | 一人 ひとり, 昨日 きのう, 二十歳 はたち |

The first four are **decomposable**: classification is derivable from the two
characters' reading types. 熟字訓 is the exception — the reading is assigned to
the compound as a unit and cannot be decomposed. Validation logic must treat it
as a special case, never as a derivation failure.

**The signature trap:** 場所 (ばしょ) is **湯桶**. 場 = ば is the *kun* reading;
the on reading is ジョウ (入場, 場面). The trap runs the opposite way from what
you might expect — learners assume a short, high-frequency reading must be on,
and so misclassify 場所 as 音音. Most people use this word daily without
noticing it is 湯桶読み. The 場 chain exists in the dataset to teach this.

⚠ The React prototype's compact entry for 場所 records it as 音音 with 場 = ば
marked `on`. That entry is wrong. See §6 defect 7.

**Meta-entries worth preserving:** 音読み is itself a 重箱読み (音 on + 読み kun).
These self-referential entries are pedagogically delightful and stay in.
See §6 — there is a known factual error in one of their trap notes.

---

## 3. Design principles

These are not aspirations. They are constraints. If a proposed feature violates
one, do not build it.

1. **Pattern recognition over memorization.** Teach the system, not the list.
   Any feature that amounts to flashcard rote for individual compounds is wrong
   for this tool. The character chains (§5) are the primary teaching device
   precisely because they show one character behaving differently across
   partners.

2. **Validate correct intuitions.** When Dan classifies correctly, the response
   should confirm and explain *why the instinct was right*, not just mark it
   green. Reveal text explains the mechanism.

3. **Native speaker ≠ ground truth.** Contested readings — where prescriptive
   and popular usage diverge, or where native speakers themselves disagree — are
   flagged and shown, never silently normalized to one "correct" answer. The
   dataset carries a set of these (貼付, 施行, 代替, 重複, 依存, 続柄, 遊説,
   一段落). Grading logic must accept documented variants.

4. **Real-world stakes.** Every entry carries a concrete situation. Keep the
   context field visible in the UI. Abstract classification without the
   "you'll meet this on a menu" hook is not what this tool is for.

5. **Maintenance, not acquisition.** Five-minute pull-based sessions. Dan opens
   the app when he wants it.

   **Explicitly forbidden:** streaks, daily goals, push notifications, reminder
   emails, badges, XP, "you haven't practiced in 3 days" messaging, or any other
   engagement mechanic. Do not add these. Do not suggest adding these. If a
   feature's value depends on prompting the user to return, it is out of scope.

---

## 4. Canonical schema — summary

`DATA_SPEC.md` is authoritative. This is the orientation summary.

The repo has **one** canonical dataset: a verbose-schema JSON file that is the
single source of truth. The app consumes a **compact** form generated from it by
a build-time transform.

- Canonical (verbose) → hand-edited, richly annotated, validated
- Compact → generated, never hand-edited, gitignored or clearly marked generated

Two historical schemas exist and must be mapped in, not preserved in parallel:

- **Verbose** — the four batch JSON files. Fields: `id, compound, reading,
  characters[] {kanji, reading_in_compound, reading_type, on_readings,
  kun_readings, reading_note}, classification, phonetic_changes,
  phonetic_change_detail, difficulty, difficulty_rationale, real_world_context,
  trap_note`, plus an `alternate_readings[]` field present on some entries.
- **Compact** — the React prototype's embedded array. Fields: `id, compound,
  reading, chars[] {k, r, t}, cls, diff, changes, changeDetail, context, trap,
  chains[]`.

The compact form carries `chains[]`, which the verbose form lacks. Chain
membership currently lives partly in the index file and partly buried in prose
trap notes. **Consolidating chains into a first-class field on the canonical
schema is real work, not a formality.** See `DATA_SPEC.md` §5.

---

## 5. Pedagogical assets — preserve these

These emerged from dataset construction and are the reason the tool works. Do
not flatten them out during consolidation or refactoring.

### Character chains (the core teaching device)

A chain is the set of entries sharing one character, ordered to reveal how
classification shifts with the partner character. Known chains:

- **場** — the richest, spanning multiple classifications. Contains the 場所
  trap. Teaches that a character's reading type is not a fixed property.
- **手** — 手本/手帳/手数 are 湯桶 (て + on); 手紙/手間 are 訓訓 (て + kun).
  Same character, same reading, classification determined entirely by the
  partner. This chain has a clean, statable rule and is the best introduction.
- **目** — semantic split: め (kun) in concrete/practical compounds (目印, 目玉,
  目安) vs モク (on) in abstract/strategic ones (目標, 目的).
- **夕** — always ゆう (kun), across 夕刊, 夕食, 夕飯, 夕暮れ. A reliability
  anchor: shows that some characters *are* stable.
- **毎** — always マイ (on); classification of 毎X is determined by the second
  character alone.
- Others mapped in `compound_readings_index.md` (一, 新, 茶, 焼, 値, 所, 本).

### The semantic heuristic — and its leaks

Concrete/physical meanings tend toward kun readings; abstract/formal meanings
tend toward on readings. This works often enough to be worth teaching (the 目
chain and the 値 split are clean demonstrations) but it **leaks**.

The 朝食/朝飯/夕食/夕飯 matrix is the documented counterexample: the register
logic that predicts 朝's behavior fails for 夕, which stays ゆう (kun) regardless
of formality. Present this heuristic to the user as a "usually works" default,
never as a rule. The tool's own design brief was violated by its author here —
that honesty is part of the content.

### Phonetic change patterns

- **連濁** (sequential voicing) — the largest cluster, 24 entries carry the
  token (audited 2026-09-06).
  はたけ → ばたけ in 茶畑.
- **促音** (gemination) — final ク/ツ before カ/サ/タ行. 学校, 早速, 約款, 切手,
  物質.
- **半濁音化** (semi-voicing) — ン + ハ行 → パ行. A complete four-entry set:
  散歩, 年俸, 心配, 乾杯. Systematic and under-taught relative to 連濁.

These clusters should be navigable as a grouping in the app, not just recorded
as per-entry metadata.

### Contested readings

Eight documented entries where prescriptive and popular usage diverge. These
carry a prescriptive form, a variant, and a status note. They exist to support
principle 3 and must not be collapsed to a single answer.

### Known dataset imbalance

重箱 is underrepresented relative to 音音. Do not fix this by generating new
entries unless explicitly asked (§7). Do surface it — the app should not present
a classification distribution as if it were natural frequency.

---

## 6. Known data defects

Found during pre-handoff review. Fix these during consolidation; do not
rediscover them.

1. **ID prefixes are unreliable.** Entry IDs look classified (`juubako_56`,
   `on_on_01`) but the prefix reflects generation order, not classification.
   Confirmed mismatches include 値段 (`juubako_56`, actually 湯桶), 勝負
   (`juubako_57`, actually 音音), 夕暮れ (`yutou_24`, actually 訓訓), 台風
   (`juubako_25`, actually 音音). **Never infer classification from an ID.**

2. **Cross-batch ID collisions — checked, none.** The audit
   (`reports/00-audit.md`, 2026-09-06) found all 168 IDs unique. Batch 3's highest
   `juubako_` number is 24; `juubako_86` belonged to the discarded batch 5. Batch 4
   begins at `juubako_25`. IDs remain unreliable (defect 1), so `DATA_SPEC.md`
   still reassigns canonical IDs and preserves originals as `source_id`.

3. **Phonetic-change vocabulary drift.** The verbose batches use English tokens
   (`"rendaku"`); the compact prototype uses Japanese (`"連濁"`). Normalize to
   one controlled vocabulary — see `DATA_SPEC.md` §6.

4. **A factual contradiction between two meta-entries.** The trap note on 音読み
   asserts that 訓読み is 訓訓. The 訓読み entry itself correctly notes that
   クン is the *on* reading of 訓 — which makes 訓読み a 重箱 compound, not 訓訓.
   The 音読み trap note is wrong. Fix it.

5. **Reasoning-in-progress left inside a data field.** The 音読み trap note
   contains a visible self-correction ("wait, 桶=おけ is kun, so 湯桶 is actually
   訓訓"). Rewrite the note cleanly. Before doing so, verify the underlying point
   against a dictionary rather than reasoning it out: in the word ゆとう, is 桶
   read とう (on) — making 湯桶 self-exemplifying as 湯桶読み — or not? Record the
   source you checked. Do not settle this by inference.

6. **Phonetic changes not always recorded.** 勝負 (しょうぶ) has a reading note
   describing フ → ぶ voicing but an empty `phonetic_changes` array. Validation
   should flag entries whose `reading_in_compound` differs from all listed
   dictionary readings while `phonetic_changes` is empty.

7. **The compact prototype misclassifies 場所.** Verbose batch 1 (`yutou_05`)
   records 場所 as `yutou` with 場 = ば `kun`, on_readings `["ジョウ"]`,
   kun_readings `["ば"]`. The compact prototype entry (`yt01`) records it as
   `on_on` with 場 = ば marked `on`, and its trap note asserts "場=ば is on
   (ジョウ contracted)." **The verbose entry is correct** and matches the
   標準 treatment of 場所 as a canonical 湯桶読み example. Per `DATA_SPEC.md`
   §4.2, verbose wins. Expect more disagreements of this kind — log every one.

8. **`reading_type` uses `"neither"`, not `"irregular"`.** Batch 1's 熟字訓
   entries mark both characters `"reading_type": "neither"`. Verified by
   parsing the recovered file. `DATA_SPEC.md` maps this value; do not invent a
   different one.

---

## 7. Guardrails

**Do not regenerate or "improve" existing dataset entries.** The dataset was
built deliberately over multiple sessions with pedagogical intent that is not
always obvious from an individual entry. Your job is to consolidate, validate,
migrate, and fix the specific defects listed in §6. If an entry looks wrong to
you and it is not in §6, flag it in a report for Dan — do not edit it.

**Do not generate new dataset entries** unless Dan explicitly asks. Expanding
the dataset is Phase 3 and requires its own tooling and review process.

**Do not restyle or redesign the drill UX.** The React prototype is the UX
spec. Port its interaction design. If you believe a mode should work
differently, say so and wait.

**Do not add engagement mechanics.** See §3.5. This is a hard line.

**Do not add a backend, accounts, analytics, or telemetry.** Static site,
localStorage, nothing leaves the device.

**Do not silently drop data during migration.** Every field in every source
entry must land somewhere in the canonical schema or be explicitly listed as
dropped in the migration report, with a count.

**Verify counts empirically.** Any number about the dataset that appears in
code, docs, or the UI must be computed from the files, never carried over from a
plan document. The counts in `BUILD_PLAN.md` are marked by confidence level —
treat unverified ones as claims to check, not facts.

---

## 8. Stack and conventions

Decisions, not options. Deviate only if you hit a concrete blocker, and say why.

- **Vite + React + TypeScript.** Static build, no backend, no SSR.
- **Styling:** Tailwind. Mobile-first. Design for a ~380px viewport first and
  let it scale up; desktop is an afterthought.
- **Dataset:** JSON in `data/`. Validated at build time — a schema violation
  fails the build, it does not warn.
- **Validation:** Zod schema as the single definition, used by both the
  validation script and the app's type layer. TypeScript types derived from it,
  not hand-written in parallel.
- **Persistence:** `localStorage` only, behind a small typed wrapper with
  versioned keys so a schema change doesn't corrupt existing progress.
- **Deploy:** GitHub Pages via GitHub Actions on push to `main`. Dan opens it in
  Chrome on Android. This replaces the artifact-preview constraint entirely —
  localStorage now works, dataset size is no longer capped.
- **Testing:** Vitest. Priority is the data layer — schema validation,
  classification derivation, chain construction, the compact transform. UI tests
  only where logic is non-trivial (selection weighting, grading with variants).
- **No external runtime dependencies for Japanese text handling.** No IME
  libraries, no dictionary APIs. Everything needed is in the dataset.

### Repo layout

```
/
├── CLAUDE.md              ← this file
├── BUILD_PLAN.md          ← phased execution plan
├── DATA_SPEC.md           ← canonical schema, authoritative
├── data/
│   ├── source/            ← original batch files, read-only, never edited
│   ├── compounds.json     ← canonical dataset (source of truth, hand-editable)
│   └── generated/         ← compact form, build output, never hand-edited
├── scripts/
│   ├── consolidate.ts     ← source batches → canonical
│   ├── validate.ts        ← canonical → pass/fail + report
│   └── build-compact.ts   ← canonical → generated compact
├── src/
│   ├── data/              ← loading, chain construction, selection logic
│   ├── modes/             ← ChainExplorer, ClassificationDrill, PredictionChallenge
│   └── ui/
└── reports/               ← migration and validation reports, committed
```

### Language and terminology

Use the Japanese terms (音音, 訓訓, 重箱, 湯桶, 熟字訓) in the UI — Dan knows
them and they are shorter than the English. Use ASCII identifiers in code
(`on_on`, `kun_kun`, `juubako`, `yutou`, `jukujikun`) so nothing depends on
source-file encoding. Keep the mapping in one place.

---

## 9. How Dan verifies

Every phase ends with something he can check on an Android phone in a few
minutes. He is not going to read your code. He is going to open a URL, tap
through it, and tell you what's wrong.

Write phase completion reports that lead with what he should tap, not with what
you implemented.
