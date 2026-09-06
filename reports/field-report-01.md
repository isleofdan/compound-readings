# Field report — Compound Readings, Session 1

To: the Personal Shipyard chat (author of `START-HERE.md`, 2026-09-05)
From: the Claude Code session that ran it on Dan's laptop, 2026-09-06

## What stands

- **The repository.** `isleofdan/compound-readings`, private, default branch `main`, 10 commits. See it at https://github.com/isleofdan/compound-readings. Local copy at `C:\Users\shulm\GithubProjects\compound-readings`.
- **The ten build files, byte for byte.** Installed at the paths in the brief's §3 table; every SHA-256 matches the zip original (table at the end of this report).
- **The scaffold.** Vite 7, React 19, TypeScript 5.9, Tailwind 4, Vitest 3, Zod 4 installed but unused. The hello page shows 複合語の読み, "Compound Readings — hello", and "168 source entries", with 168 computed at build time by `scripts/source-count.ts` from the four batch files. `npm test` (5 tests, one of which recounts the files independently and compares), `npm run build` (type-check then bundle) and `npm run validate` (placeholder line) are all green. Vite `base` is `/compound-readings/`. Checked by eye at 380 px and 1280 px.
- **The multi-user rule.** `CLAUDE.md` §1 now contains the sentence "no path, storage key, identifier, or data shape may assume there is only one user" and no longer contains "There is no other user"; `DATA_SPEC.md` §9 has the key shape `cr:<userId>:progress:v<schema>`; `BUILD_PLAN.md` 2.1 has the namespacing sentence. The prototype row in Status of inputs reads: located, installed, 43 entries, [V].
- **The deploy path, three quarters proven.** `.github/workflows/deploy-pages.yml` is committed. In GitHub Actions its build job (Node 20, `npm ci`, `npm test`, `npm run build`, upload) passes; its deploy job fails because Pages is not enabled (ask 1). Nothing is live.
- **The audit.** `scripts/audit.ts`, run with `npx tsx scripts/audit.ts` or `npm run audit`, writes `reports/00-audit.md` (767 lines). Two consecutive runs produce identical files. See it at https://github.com/isleofdan/compound-readings/blob/main/reports/00-audit.md.
- **Corrected planning documents.** `BUILD_PLAN.md` and `CLAUDE.md` corrected where the audit refuted them; `DATA_SPEC.md` received only the one token-mapping paragraph the brief allowed. The full list is audit §7; contradictions left uncorrected are audit §7.1.
- **`PLAN.md`** has the five-line current state and the dated close-out note.

## What the brief got wrong

Facts the next brief must carry, each computed from the files.

- **The prototype has 43 entries**, not ~45 (IDs on01–on12, kun01–kun09, jb01–jb08, yt01–yt07, jk01–jk07).
- **Three prototype entries have no source entry at all**: 会議, 毎日, 若葉. No source entry carries those compounds under any reading.
- **Prototype vs source disagreements: 28 rows across 15 prototype entries.** 8 classification, 6 reading_type, 14 reading_in_compound. The six reading_type rows are exactly the ones the brief predicted: 場 = ば marked `on` in 職場, 場面, 立場, 本場, 役場, 場所 where the source says `kun`. The 14 reading_in_compound rows are all 熟字訓: the prototype writes — for both characters, while the source splits the reading across them (大人 → おと + な, 昨日 → き + のう, 明日 → あし/あ + た/す). Two more classification rows are not about 場: the prototype calls 夕食 and 夕飯 重箱, the source calls both 湯桶.
- **`juubako_86` was never in batch 3.** Batch 3's highest `juubako_` number is 24; `juubako_86` was the truncation point of the discarded batch 5 (the recovery report says so itself). `CLAUDE.md` §6.2, `BUILD_PLAN.md` 0.1 and `DATA_SPEC.md` §4.3 all repeated the batch-3 version. There are **0 duplicate IDs** across the 168. Canonical ID reassignment is still right, because 45 of 168 prefixes contradict the classification.
- **Batches 1–3 split** is 音音 38, 訓訓 32, 重箱 19, 湯桶 18, 熟字訓 18, irregular 1 = 126, not 35/27/20/21/21/2. Batch 1's 7/7/8/6/2 is confirmed.
- **連濁 carries 24 entries, not ~30; 促音 carries 9, not around six** (学校, 早速, 約款, 切手, 物質, 真っ赤, 真っ白, 真っ黒, 真っ青).
- **The 半濁音化 four are exactly 散歩, 年俸, 心配, 乾杯, but every one is filed under the token `other`** with 半濁音化 named only in the detail text. No source entry uses a 半濁 token; the `handakuon` code in `DATA_SPEC.md` §6 has zero users until consolidation promotes these four.
- **The recovery report's "2 of 163" derivation violations** are 2 of 145 decomposable two-character entries (163 two-character, 18 熟字訓 excluded): 革靴 and 初耳, as it says. Two further two-character entries, 真っ赤 (kun + on) and 真っ青 (kun + kun), are classified `irregular` and so cannot be derived at all.
- **Four entries sit outside the five categories**, where `DATA_SPEC.md` §3 expects two: 朝寝坊 (`irregular`, three characters), 真っ赤 and 真っ青 (`irregular`), and 峠 (`n/a`, a single kanji, not a compound).
- **The recovery report's chain table omits nine kanji** that also appear in three or more compounds: 人 6, 日 6, 真 6, 立 4, 月 3, 段 3, 組 3, 花 3, 見 3. Its 18 rows are all confirmed; the full list is 27.
- **`alternate_readings[].status` is free text in the source**, 14 distinct strings such as `standard — different meaning` and `variant — NHK changed to permit いぞん in 2014`. It is not the six-value enum of `DATA_SPEC.md` §7.3. Not in `CLAUDE.md` §6.
- **Eleven compounds contain kana** (気持ち, 揚げ物, 追い風, 真っ赤, 真っ白, 真っ黒, 真っ青, 枠組み, 夕暮れ, 音読み, 訓読み), so `DATA_SPEC.md` §7.1's ERROR rule "concatenating `characters[].kanji` equals `compound`" fails all eleven as written. Not in `CLAUDE.md` §6.
- **Three 熟字訓 entries have mixed reading types**: 果物 (neither, kun), 一人 (kun, neither), 二人 (kun, neither). `DATA_SPEC.md` §7.2 makes that a WARN; not in `CLAUDE.md` §6.
- **Self-correction markers appear in 12 entries**, not "six" or seven: 凡例, 世論, 楽屋, 雨量, 割引, 番地, 真っ赤, 革靴, 灰色, 初耳, 音読み, 訓読み. 場面, which the recovery report names, is not caught by a word scan for wait / actually / hmm / correction.
- **The 勝負-type omission check finds 11 characters in 10 entries**, but most are 連用形 stems recorded against dictionary-form kun readings (消印 けし, 漬物 つけ, 揚げ物 あげ, 受付 つけ, 申込 もうし + こみ, 続柄 つづき, 音読み よみ, 訓読み よみ) plus 新手 あら and 勝負 ぶ. Only 勝負 is a sound change; the validator will need to treat stems as matches or it will warn on all of them.
- **Two counts the brief gave as claims are confirmed:** 30/50/46/42 = 168, and the eight contested compounds are all present (貼付 and 遊説 without any recorded alternate reading, though).
- **Step 5 never reached the private-repo trap.** The `gh api` call to enable Pages was refused by Claude Code's own permission check on the laptop (a repository-settings change), not by GitHub. `gh api user` reports `plan: null`, so whether Pages works on a private repo under Dan's plan is still unknown.
- **`compound_readings_analysis.md`** is absent, as the brief said; recorded in `PLAN.md`.

## Deliberate divergences

- **A `.gitattributes` file** marks `data/source/**` as never line-ending-converted. This laptop's git converts line endings system-wide; the guard keeps the read-only rule true inside git, not only on disk. The files turned out to be LF already, so it changed nothing this time. DO NOT REVERSE.
- **`data/generated/` is ignored as `data/generated/*` with `!data/generated/.gitkeep`**, so the placeholder the brief asked for can be committed while the folder's contents stay ignored.
- **No `.gitkeep` in `scripts/`**: the folder holds `source-count.ts`, its test, and `audit.ts`.
- **The page paints its own white background and light color scheme.** The first render in a dark-themed viewer showed near-black text on a near-black ground. DO NOT REVERSE.
- **`npm run build` runs the TypeScript checker first**, so a type error in `src/` or `scripts/` fails the build. `tsx` is a dev dependency and `npm run audit` is a script, so the audit runs the same way locally and in the cloud.
- **The workflow was committed although Pages could not be enabled.** Every push now produces a failed run (build green, deploy red) until Pages is on; GitHub may email Dan about each. Committing it was the only way to prove the build half of the path and to leave the next session nothing to write.
- **One extra commit** ("Keep the multi-user rule sentence on one line"): my first wrap of the §1 paragraph split the required phrase across two lines, which would have failed the brief's own verification.
- **Batch 2 and 3 rows in `BUILD_PLAN.md` were upgraded from [T] to [V]** although they were confirmed, not contradicted. Leaving confirmed numbers marked unverified after an audit seemed worse than the strict reading of the rule.
- **The audit separates two kinds of derivation mismatch** (stale field vs `irregular` classification) rather than reporting one number, because they need different fixes.
- **Git author identity** was set in this repository only (isleofdan, dan@shulman-advisory.com, the same as ClaudeTesting) because the laptop has none configured globally.

## Asks

1. **[DAN GATE] Enable GitHub Pages.** This is the only thing between the repo and a live URL, and it is Dan's action. Recommended answer: Dan opens the repository's Settings, then Pages, and sets the source to "GitHub Actions"; then re-runs the failed workflow (Actions tab, latest run, "Re-run all jobs") or waits for the next push. If GitHub refuses because the repository is private on a free plan, recommended answer: make the repository public. The data is a study dataset and the app has no secrets; the alternative is Fly.io hosting, which costs money and a laptop deploy step.
2. **Should future sessions be allowed to change repository settings through the GitHub CLI?** That is what was blocked. Recommended answer: no. Keep settings changes as Dan's; sessions push code and report.
3. **Free-text alternate-reading status.** Consolidation must map 14 free-text strings onto the six-value enum. Recommended answer: map by rule (strings starting "standard" → `standard`; "variant — NHK…" and "increasingly accepted" → `variant_accepted`; "widespread but contested" and "originally non-standard" → `variant_spreading`; "domain-specific" → `standard` with a note), keep every original string verbatim in `contested_note`, and list every mapping in the migration report.
4. **Kana inside compounds.** Eleven entries fail the spec's concatenation rule as written. Recommended answer: keep `compound` as written, count and compare kanji only (strip kana) in `char_count` and the §7.1 check, and tag the 真っX set `color`.
5. **The four entries outside the five categories.** Recommended answer: 真っ赤 → 湯桶 (kun + on, 促音), 真っ青 → 訓訓 (kun + kun), 朝寝坊 → asserted 訓訓 with `char_count: 3`, all three tagged `unclassifiable` only if Dan disagrees; 峠 is a single kanji, not a compound, and should be dropped from the dataset with a line in the migration report unless Dan wants it kept as a 国字 example.
6. **The three uncorrected `DATA_SPEC.md` lines** (§4.3 "collisions are near-certain", §6 "~30" and "around six"). Recommended answer: the next brief authorizes correcting them, since the spec is authoritative and now contradicts the audit.

## For Dan to tap

Nothing is live yet, so there is nothing to open on the phone. The one tap is ask 1: enable Pages in the repository settings. Once that is done and the workflow has re-run green, open https://isleofdan.github.io/compound-readings/ on the phone. It should show a Japanese heading, the word "hello", and an entry count. Tell me the count you see; it should be 168.

## Appendix — SHA-256 of each installed file against its zip original

| Zip file | Installed as | Match | First 12 hex |
|---|---|---|---|
| CLAUDE.md | CLAUDE.md | match | 689d1123c7ca |
| BUILD_PLAN.md | BUILD_PLAN.md | match | 2f35ea1b55cb |
| DATA_SPEC.md | DATA_SPEC.md | match | a7f7bf1084ef |
| RECOVERY_REPORT.md | reports/00-recovery.md | match | 177f8cc150b7 |
| compound_readings_data.json | data/source/compound_readings_data.json | match | 606a02019da3 |
| compound_readings_batch2.json | data/source/compound_readings_batch2.json | match | 72adc222fe1b |
| compound_readings_batch3.json | data/source/compound_readings_batch3.json | match | f52abadeb667 |
| compound_readings_batch4.json | data/source/compound_readings_batch4.json | match | 9a4ffe0e9125 |
| compound_readings_index.md | data/source/compound_readings_index.md | match | 35d1f4217e1e |
| compound-drill.jsx | data/source/compound-drill.prototype.jsx | match | 1d8da6866d2b |

Hashes were taken at install time (step 2). `CLAUDE.md`, `BUILD_PLAN.md` and `DATA_SPEC.md` were then amended in steps 4 and 6 as the brief instructed, so their current hashes differ from the zip by design; the seven files marked never-edit still match.
