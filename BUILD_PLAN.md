# BUILD_PLAN.md — Compound Readings Drill Tool

Read `CLAUDE.md` first. This document assumes it.

Phases are sequential. Do not start a phase before its predecessor's definition
of done is met and Dan has signed off on the Android checkpoint.

---

## Status of inputs — read this before anything else

**The six dataset files were not available when this plan was written.** The
planning session that produced these documents had zero uploaded files. Every
factual claim below about the dataset therefore comes from transcripts of the
sessions that *created* those files, not from the files themselves.

Claims are marked by confidence:

- **[V]** — verified: file recovered, parsed, and counts computed.
- **[T]** — recovered from a creation-time chat transcript. Reliable, but the
  file may have changed after creation.
- **[U]** — unverified. Carried from a planning brief. Check before relying on it.

Nothing in this plan may be treated as verified until Phase 0 Task 1 confirms it
against real files. If a [T] or [U] number turns out wrong, the file wins —
correct the document and note the correction in `reports/`.

### Phase −1 — Dataset recovery (NOT a Claude Code task)

This must happen before handoff, and it cannot happen in Claude Code.

The six files exist only as artifacts of past chat sessions in Dan's Claude
project. Claude Code has no access to that chat history. Recovery therefore has
to be done in the project workspace, by an instance with conversation search,
and the resulting files handed to Claude Code as ordinary uploads.

Recovery target:

| File | Contents | Confidence |
|---|---|---|
| `compound_readings_data.json` | Batch 1, 30 entries — **RECOVERED** | [V] |
| `compound_readings_batch2.json` | Batch 2, 50 entries | [T] |
| `compound_readings_batch3.json` | Batch 3, 46 entries | [T] |
| `compound_readings_batch4.json` | Batch 4, 49 entries (IDs described as "entries 127–175") | [T] |
| `compound_readings_index.md` | Cross-reference index | [T] |
| `compound_readings_analysis.md` | Architecture + interaction model + honest assessment | [U] |
| Prototype `.jsx` | ~45 embedded compact entries, three modes | [U] on count |

**Index coverage — answered.** The index covers batches 1–3 only. Its own entry
count table stops at Batch 3 and totals 126; it was written before batch 4
existed, and batch 4's notes describe filling gaps the index identified. [T]
Batch 4's 49 entries are therefore **not** represented in the chain maps or
coverage tables. Rebuilding the index from the consolidated dataset is a Phase 0
deliverable, not an optional extra.

**Batch 5 does not exist.** It was truncated mid-generation and deliberately
discarded. If a fragment surfaces during recovery, discard it again. Do not
attempt to salvage or complete it. [T]

If recovery yields partial files, that is acceptable — consolidate what exists
and let the validation report show the holes. Do not fill holes by generating
replacement entries.

---

## Phase 0 — Scaffold and data consolidation

The highest-value phase. Everything downstream depends on there being one
trustworthy dataset.

### Tasks

**0.1 — Empirical audit.** Before writing any transform, load each source file
and report: entry count, exact field set (including fields present on only some
entries), classification distribution, ID list, and any parse failures. Compare
against the [T]/[U] claims in this document and in `CLAUDE.md`. Produce
`reports/00-audit.md`. **Do not proceed until this is done and Dan has seen it.**

Specifically confirm or refute:
- Total across four batches ≈ 175 [T]
- Batches 1–3 classification split: 音音 35, 訓訓 27, 重箱 20, 湯桶 21, 熟字訓 21,
  irregular/3-char 2 — totalling 126 [T]. Batch 1's own split is confirmed [V]:
  音音 7, 訓訓 7, 重箱 8, 湯桶 6, 熟字訓 2 = 30, matching the index table exactly.
- Presence of `alternate_readings[]` on some but not all verbose entries [T]
- Cross-batch ID collisions (batch 3 reached `juubako_86`; batch 4 opens at
  `juubako_25`) [T]

**0.2 — Repo scaffold.** Vite + React + TypeScript, Tailwind, Vitest, the
directory layout in `CLAUDE.md` §8, GitHub Actions workflow for Pages. Get a
"hello" page deployed and confirm Dan can load the URL on his phone before
putting any real work behind it.

**0.3 — Canonical schema.** Implement `DATA_SPEC.md` as a Zod schema in
`src/data/schema.ts`. Derive TypeScript types from it. This is the only place
the shape of an entry is defined.

**0.4 — Consolidation script.** `scripts/consolidate.ts` reads
`data/source/*.json`, maps each entry into the canonical schema per
`DATA_SPEC.md` §4, assigns canonical IDs, preserves `source_id` and
`source_batch`, and writes `data/compounds.json`.

Must emit `reports/01-migration.md` listing: entries in, entries out, every
field dropped with a count, every ID reassigned, every entry that needed a
judgement call. Silent data loss is a bug.

**0.5 — Chain consolidation.** Extract chain membership from three places — the
compact prototype's `chains[]`, the index file's chain maps, and prose trap
notes in the verbose entries — and write it into the canonical `chains[]` field.
This is the messiest task in Phase 0. Trap notes state chain membership in
English prose ("目 chain: め(kun) in 目印/目玉/目安..."), so extraction is
partly manual. Produce a proposed chain assignment for Dan's review rather than
committing it blind. Chains named in `CLAUDE.md` §5 must all survive.

**0.6 — Validation script.** `scripts/validate.ts` implements `DATA_SPEC.md` §7.
At minimum: duplicate IDs, schema violations, missing required fields, and
classification/reading-type derivation mismatches for the four decomposable
categories, with 熟字訓 excluded from derivation and checked separately. Also the
defect checks in `CLAUDE.md` §6 — notably entries whose reading differs from all
listed dictionary readings while `phonetic_changes` is empty.

Validation failure fails the build. Not a warning.

**0.7 — Fix the six known defects** in `CLAUDE.md` §6. Only those six. Anything
else you notice goes in `reports/02-flagged.md` for Dan.

**0.8 — Compact transform.** `scripts/build-compact.ts` generates the app-facing
compact form. Round-trip test: compact output must be reconstructible into the
same field values it was derived from. The compact form is never hand-edited and
should be visibly marked as generated.

**0.9 — Regenerate the index** from the consolidated dataset, now covering all
four batches. This replaces the hand-written index as a maintained artifact.

### Definition of done

- One `data/compounds.json` passing validation with zero errors
- Migration report accounts for every source entry and every dropped field
- Chain assignments reviewed and approved by Dan
- Compact form generated, round-trip tested
- Regenerated index covering all batches
- `npm run validate` and `npm test` both green in CI

### Android checkpoint

Deploy a bare data-inspection page. Dan opens it on his phone and checks:

1. Total entry count matches the audit
2. Search 場 — every entry in the 場 chain appears, and 場所 shows as 湯桶
3. Search 手 — 手本/手帳/手数 show 湯桶, 手紙/手間 show 訓訓
4. Filter to 熟字訓 — entries look right and none were mangled by the transform
5. Filter to 半濁音化 — exactly four entries (散歩, 年俸, 心配, 乾杯)
6. Open 音読み — the trap note reads cleanly with no leftover reasoning

No drill functionality yet. This checkpoint exists to catch migration damage
while it is still cheap to fix.

---

## Phase 1 — Port the drill app

The prototype is the specification. Port its interaction design; do not
reinvent it. If you think a mode should work differently, write it up and wait.

### The three modes

**Chain Explorer.** Pick a character, work through its compounds in a sequence
that reveals how classification shifts with the partner. This is the highest-
value mode and the reason the tool exists — build it first and get it right
before touching the others. Suggested entry point is the 手 chain, which has a
clean statable rule; 場 is the payoff chain because it spans the most
classifications and contains the 場所 trap.

**Classification Drill.** Show a compound, user classifies it into one of five
categories, reveal shows the answer with per-character reading types, phonetic
changes, and the trap note. Reveal must explain *why*, not just mark correct.

**Prediction Challenge.** Given a compound plus a classification hint, predict
the reading. Grading must accept documented alternate readings — see the honest
assessment below on why this mode is harder than it looks.

### Tasks

1.1 — Data layer: load canonical data, build chain indices, classification and
difficulty filters, phonetic-cluster grouping.
1.2 — Chain Explorer, full dataset.
1.3 — Classification Drill.
1.4 — Prediction Challenge, with variant-tolerant grading.
1.5 — Navigation between modes. Thumb-reachable. Assume one-handed use.
1.6 — Contested-reading display: when an entry has alternates, show them with
their status rather than picking a winner.

### Definition of done

- All three modes running against the full dataset, not a subset
- Every entry reachable in at least one mode
- No mode crashes on edge-case entries (熟字訓, three-character compounds,
  entries with empty trap notes or null phonetic detail)
- Renders correctly at 380px with no horizontal scroll

### Android checkpoint

Dan runs a real five-minute session on his phone:

1. Chain Explorer through 場 end to end — does the classification shift land?
2. Chain Explorer through 目 — does the concrete/abstract split come through?
3. Twenty classification drills — no layout breakage, no unreadable furigana
4. Ten prediction challenges including at least one contested reading — is a
   correct variant accepted?
5. All of it one-handed, without zooming

The question he is answering is not "does it work" but "would I do this again
tomorrow."

---

## Phase 2 — Persistence and session design

Now that localStorage is available, make sessions accumulate.

### Tasks

2.1 — Typed localStorage wrapper with versioned keys and a migration path.
Corrupt or unreadable stored state must degrade to a fresh start, never a white
screen.
2.2 — Per-entry accuracy tracking: attempts, correct, last seen, per mode.
2.3 — Difficulty-weighted selection: recently-missed and never-seen entries
surface more often; reliably-correct entries recede. Weighting must be
inspectable and tunable in one place.
2.4 — Session boundary: a session is a fixed number of items (default ~20,
adjustable), ending with a summary of what was missed and which chains those
misses clustered in. Chain clustering is the useful signal — "you missed four
things and three were 場 compounds" is actionable in a way that a percentage
score is not.
2.5 — Data export/reset: a plain JSON dump of progress and a clear reset. Dan
owns his data and can wipe it.

### Explicitly not in this phase

No streaks. No daily targets. No notifications. No "come back" prompts. No
scoring that persists across sessions as a headline number. The summary exists
to direct the next session, not to be a scoreboard. See `CLAUDE.md` §3.5.

### Definition of done

- Progress survives closing the browser and reopening
- Weighted selection demonstrably resurfaces missed entries — write a test that
  proves it rather than eyeballing it
- Corrupt localStorage recovers gracefully
- Export produces valid JSON; reset actually clears

### Android checkpoint

1. Run a session, miss several entries deliberately, close Chrome entirely
2. Reopen the next day — do the missed entries come back around?
3. Does the session summary point at a chain worth revisiting?
4. Reset, confirm clean state

---

## Phase 3 — Flagged, not planned

One paragraph each. Do not build these without a fresh conversation with Dan.

**Dataset expansion tooling.** 重箱 is underrepresented relative to 音音 [T:
20 vs 35 across batches 1–3]. Fixing that means generating entries, which is
what broke down in chat — batch 5 died to context degradation and schema drift
went uncaught between batches. The right shape is a tool problem, not a
generation problem: a template-driven entry scaffold plus the existing validator
running on every addition, so drift fails immediately rather than three batches
later. The index also lists specific unfilled gaps — number compounds, color
compounds (真っ赤, 真っ青), 地名 patterns, keigo-adjacent お+X compounds, more
国字 structural constraints, counter/measurement compounds.

**Phonetic-family integration.** The broader project has reference material on
roughly 200 phonetic families predicting readings for 1400+ kanji. Integrating
it would let the tool answer "why is this character read this way" at a level
below classification — turning some memorized cases into predicted ones. This is
a data-sourcing problem before it is a code problem.

**Sibling modules.** Name pronunciation (finite problem space, the 人名用漢字
list exists, high real-world impact) and okurigana variation (compact scope,
directly tests the pattern-over-memorization principle) were identified as the
other two quick wins alongside compound readings. They would share the schema
conventions, validation tooling, and drill shell built here. Whether they become
separate apps or modes inside this one is an open question.

---

## Honest assessment

Required reading before Phase 1. The framework is good but it does not do
everything the pitch implies.

**Classification does not get you to a reading.** This is the central strain.
Knowing 手数 is 湯桶 tells you 手 takes a kun reading and 数 an on reading. It
does not tell you *which* kun reading (て or た), *which* on reading (スウ or
ス), or whether a phonetic change applies. Prediction requires classification
plus per-character reading inventory plus phonetic-change rules. The
assessment from the original dataset session put it at roughly **one third of
entries needing knowledge beyond classification alone** [T]. That is a real
number and Prediction Challenge should be built with it in mind — the mode is
teaching a harder skill than Classification Drill, and grading it purely
right/wrong will feel unfair. Consider surfacing *why* a prediction missed:
wrong reading type is a classification failure; right type but wrong reading is
an inventory gap; right reading but wrong voicing is a phonetic-change gap.
Those are three different problems and lumping them into "incorrect" wastes the
signal.

**The semantic heuristic is leaky and the dataset documents its own leak.** The
朝食/朝飯/夕食/夕飯 matrix contradicts the formality-predicts-on rule that works
cleanly for 朝. Do not let the UI present the heuristic as a rule. Presenting
"usually" as "always" is precisely the failure mode this tool was built to
correct in the learner.

**Some chains teach more than others.** 手 has a clean rule. 目 has a clean
semantic split. 夕 teaches stability. 場 is the payoff. Other characters have
two or three entries and no discernible pattern — a chain with three entries and
no rule is not a lesson, it is a list. Phase 1 should set a minimum bar for what
counts as a teachable chain and treat the rest as ordinary entries.

**The dataset's classification distribution is not natural frequency.** It
reflects what got built, in what order, with a known 重箱 shortfall. If the app
ever shows a distribution chart or picks entries "representatively," it will be
representing the construction history, not Japanese.

**Quality varies by batch and nobody checked.** Schema drift went uncaught
between batches [T], the ID scheme is unreliable [T], at least one entry pair
contradicts itself factually, and one trap note contains the model's own
mid-thought reasoning. That is what happens without validation tooling, and it
is the strongest argument for Phase 0 preceding everything else. Expect the
audit to find more than the six defects already catalogued.

**What this tool genuinely does well.** It converts an apparently arbitrary
domain into a small number of navigable systems. The chains are the real
product. A learner who works the 場 chain understands on/kun selection more
deeply than one who drills a hundred isolated compounds — that claim is the
project's core bet, and it is worth building the app to test it.
