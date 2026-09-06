# PLAN.md

## Current state

- The repository `isleofdan/compound-readings` exists (public since 2026-09-06 by Dan's decision, default branch `main`) with the ten planning and source files from the Session 1 zip installed byte for byte; everything under `data/source/` is read-only history and is never edited.
- The scaffold builds and tests green: Vite + React + TypeScript, Tailwind, Vitest, with Zod installed for the next session; the only page is the hello page, which shows the source-entry count (168) computed at build time from the four batch files.
- The site is live at https://isleofdan.github.io/compound-readings/ (GitHub Pages, deployed by the workflow on every push to `main`); the hello page there shows the 168 count.
- The empirical audit exists: `npx tsx scripts/audit.ts` (or `npm run audit`) regenerates `reports/00-audit.md` byte for byte; the planning documents were corrected where the audit refuted them (audit §7).
- `compound_readings_analysis.md` (named in `BUILD_PLAN.md` and `reports/00-recovery.md`) is absent and its status is unknown; Phase 1 proceeds from `BUILD_PLAN.md`'s Phase 1 text and the prototype if it never appears.

## Close-out notes

### 2026-09-06 — Session 1 (brief from the Personal Shipyard chat)

- **Built:** the repository; README, `.gitignore`, `.gitattributes`; the ten files installed with SHA-256 verified against the zip; the Vite/React/TypeScript/Tailwind/Vitest scaffold with the hello page and one test tying the page's count to the files; the multi-user rule written into `CLAUDE.md` §1, `DATA_SPEC.md` §9 and `BUILD_PLAN.md` 2.1; `.github/workflows/deploy-pages.yml`; `scripts/audit.ts` and `reports/00-audit.md`; `reports/field-report-01.md`.
- **Audit confirmed:** 168 entries (30 + 50 + 46 + 42); batch 1 split 7/7/8/6/2; 0 duplicate IDs; 45 of 168 ID prefixes contradict the classification; 2 real derivation violations (革靴, 初耳); reading_type on 156 / kun 144 / neither 39; tokens rendaku 24 / sokuon 9 / other 4; 21 entries with alternate readings; 163 two-character, 4 three-character, 1 single-character; the 半濁音化 set is exactly 散歩, 年俸, 心配, 乾杯 (all filed under `other`); all 8 contested compounds present; 場所 is 湯桶 with 場 = kun in the source.
- **Audit refuted:** total ≈175 (168); batch 4 = 49 (42); prototype ~45 (43); batches 1–3 split 35/27/20/21/21/2 (38/32/19/18/18/1); "batch 3 reached juubako_86" (batch 3's highest is 24; juubako_86 was the discarded batch 5); "collisions likely" (none); 連濁 ~30 (24); 促音 around six (9); the recovery report's chain table of 18 characters (27 kanji appear in three or more compounds); the recovery report's "2 of 163" derivation violations (2 of 145 decomposable, plus 2 `irregular` entries 真っ赤 and 真っ青 that derive to 湯桶 and 訓訓).
- **Prototype disagreements:** 28 rows across 15 of the 43 prototype entries — 8 classification, 6 reading_type (all six are 場 = ば marked `on` in the prototype and `kun` in the source: 職場, 場面, 立場, 本場, 役場, 場所), 14 reading_in_compound rows on 熟字訓 where the prototype writes — and the source splits the reading across characters. 3 prototype entries have no source match (会議, 毎日, 若葉).
- **Pages:** live. The first attempt to enable it was blocked by Claude Code's permission check; the second, after Dan made the repository public (GitHub refused Pages on a private repository under his plan), succeeded from the laptop. The failed deploy run was re-run and passed; the live page was checked by body text and by a phone-sized render, and Dan confirmed on his own phone that it shows the heading, "hello" and the count (Android checkpoint for task 0.2 passed, 2026-09-06).
- **Next session:** Phase 0 tasks 0.3–0.9 (schema, consolidation, chains, validation, defect fixes, compact transform, index). It can run in the cloud: everything it needs is on GitHub. The audit's §7.1 lists contradictions left for it in `DATA_SPEC.md` and `reports/00-recovery.md`, and the field report's asks list the data decisions it needs answered first.
