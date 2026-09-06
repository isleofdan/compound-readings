# Field report — Compound Readings, Session 4

To: the Personal Shipyard chat (author of `START-HERE.md`, 2026-09-06, "Session 4: the two drills")
From: the Claude Code cloud session that ran it, 2026-09-06

## What stands

- **Both drills are live** at https://isleofdan.github.io/compound-readings/ — four tabs: 鎖, **分類** (Classification Drill), **予想** (Prediction Challenge), 検索. Phase 1 is complete pending Dan's phone checkpoint.
- **Classification Drill** (`#/drill`): the card shows compound, reading and context; five answer buttons with Japanese labels (音音 / 訓訓 / 重箱 / 湯桶 / 熟字訓, each with its structure under it) sit in a bar just above the tab bar. The outcome says 正解 or 不正解, always states the mechanism (場 = ば（訓）+ 所 = しょ（音）→ 湯桶), and on a miss adds the line per character that separates the answer from the right one (場 = ば はここでは訓、音ではない); then the full entry reveal with contested readings; then 次へ. Tally: counts of 正解 and 不正解 for this page load, no percentage, no position counter.
- **Prediction Challenge** (`#/predict`): the card shows compound, context and the hint (the classification badge plus 音/訓 under each character; for 熟字訓 the whole-word note); a kana text field (`lang="ja"`, hiragana or katakana accepted) and 答える. Grading accepts the primary reading and every alternate whose status is not `nonstandard`, and names what it accepted: 正解（主読み）or 別読みで正解 with the alternate's status (せこう — 変種・広まりつつある). A miss is named: 分類の誤り / 読みの誤り / 音変化の誤り, one Japanese line per character (畑: はたけ → ばたけ（連濁）; 場 = じょう は音読み — ここでは訓（ば）); no covering segmentation is 部分一致なし with the right reading stated; 熟字訓 is 熟字訓の誤り with the reason decomposition fails. The reveal shows the accepted readings with statuses, per-character types with on/kun inventories, phonetic change, alternates, the trap note. Tally by outcome.
- **The grading rules** are in `src/modes/predict/grade.ts` (the paragraph is in `PLAN.md`); the brief's cases come out as follows — every one asserted in `src/modes/predict/grade.test.ts`:

  | Case | Outcome |
  |---|---|
  | 手数 てすう | 正解 |
  | 手数 てかず | **分類の誤り** (the brief expected 読みの誤り — see below) |
  | 手数 しゅすう | 分類の誤り |
  | 場所 ばしょ / じょうしょ | 正解 / 分類の誤り |
  | 茶畑 ちゃばたけ / ちゃはたけ | 正解 / 音変化の誤り (連濁) |
  | 学校 がっこう / がくこう | 正解 / 音変化の誤り (促音) |
  | 施行 しこう / せこう / せぎょう | 正解（主読み）/ 別読みで正解（変種・広まりつつある）/ 別読みで正解（標準） |
  | 大人 おとな / だいじん | 正解 / 熟字訓の誤り, no cause analysis |

  Also tested: 代替 だいがえ is 別読みで正解 and the text never says だいたい is "the" form; 手数 てす is 読みの誤り; 手数 てずう is 音変化の誤り the other way (連濁をかけすぎ); the primary reading and every accepted alternate of all 161 predictable entries grade correct; nothing throws on any of the 168 entries for nonsense input.
- **Pools, computed:** Classification Drill **164** (168 minus the four `unclassifiable`: 朝寝坊, 真っ赤, 真っ青, 峠); Prediction Challenge **161** (also minus the three-character 一段落, 五月雨, 二十歳). 熟字訓 entries are in both. Order is a uniform shuffle with no repeat until the pool is exhausted, then a new shuffle whose first item differs from the last shown (tested with a seeded generator). Filter chips (5 classifications, 4 difficulties, 6 phonetic changes) fold behind 絞り込み and live in the URL (`#/drill?cls=yutou`, `#/predict?pc=rendaku`, also `diff=`); the pool count ("164語") is always visible.
- **Every entry reachable:** a test computes chains ∪ drill ∪ predict ∪ Browse = 168. **Reachable only via Browse: 朝寝坊, 真っ赤, 真っ青, 峠** — exactly the unclassifiable four, none of which is in a lesson chain. No mode throws on 熟字訓, 峠, 朝寝坊, 一段落, or the 17 entries with a null trap note and the 131 with null phonetic detail (rendered in the test). 380 px: no horizontal overflow on any of the 31 screens (the screenshot script asserts it).
- **Labels are Japanese:** 規則 / だいたい / 例外 / 開く / 別読み / 全部開く / 全部閉じる as decided, plus 規則なし, the alternate-status labels (標準 / 変種・許容 / 変種・広まりつつある / 規範のみ・実用まれ / 論争中 / 非標準), the card labels (場面 / 罠 / 異論あり / 出典 / ← 鎖 / N語) and Browse's field labels (音変化 / タグ / 鎖 / 難易度 / なし / N / M語). The drill labels are Japanese from the start (分類ドリル, 読み予想, 正解, 別読みで正解, 不正解, 分類の誤り, 読みの誤り, 音変化の誤り, 熟字訓の誤り, 部分一致なし, 次へ, 答える, リセット, 絞り込み, ヒント, 主読み, 正解となる読み). **English kept, and why:** the tab hints "Chains" and "Browse" (the brief said keep them); prose sentences rather than labels — the chain list's subtitle, "Usually, not always — expect exceptions.", the not-a-lesson messages, "See the 場 words in Browse", the Browse heading's "— Browse", the imbalance sentence, "No entry matches.", the search placeholder, and the 熟字訓 whole-word sentence in the reveal — because rewording Chain Explorer and Browse beyond the label switch was out of scope (§8); the `unclassifiable` tag chip (a tag code, not a label); and the source status text under 出典 (data, verbatim). Ask 3.
- **Screenshot tooling in the repo:** `playwright-core` 1.58.2 as a devDependency, `scripts/screenshots.mjs`, `npm run screenshots -- --set session-4 --out reports/screenshots/session-4`. It serves `dist/` with Vite's preview server, finds Chromium from `CHROMIUM_PATH` or `PLAYWRIGHT_BROWSERS_PATH`, renders each named screen at 380×915 and 1280×800 as a viewport capture, checks `scrollWidth` at every shot and fails on console errors. It reproduced Session 3's 15 screens (all 30 files, same sizes; bytes differ only because the labels changed — the chain card renders pixel-identical before and after the reveal extraction). README has the one-line Chromium note. **62 screenshots** in `reports/screenshots/session-4/`: the 15 Session 3 screens, the drill before / correct / wrong (top and bottom) / filtered, the prediction before / miss / filtered, and 施行 せこう (top and bottom), 場所 じょうしょ, 茶畑 ちゃはたけ, 学校 がくこう, 手数 てすう, 大人 だいじん.
- **Numbers:** 139 tests green (38 new); `npm run validate` 0 ERRORs / 17 WARNs (unchanged); `npm run build` green; bundle 378 kB JS / 18.7 kB CSS.
- **`main` updated.** Fast-forward of `session-4-drills` (six commits, then the close-out), pushed. Pages runs: see "Deploys" at the end. `git status` clean; nothing unpushed.

## What the brief got wrong

Facts the next brief must carry.

- **The cloud session opened in `isleofdan/ClaudeTesting` again**, with a designated branch there; `compound-readings` was attached and cloned to `/home/user/compound-readings` before §6. This is the second session in a row; the brief's "if" is the rule.
- **てかず is a classification miss under the brief's own definition.** Rule 4 defines (a) classification as "the reading types are wrong" and (b) inventory as "types right, but a different on/kun reading". 数 = かず is the *kun* reading where 手数 needs the *on* reading すう, so the types are wrong and the grader says 分類の誤り. The brief listed it as inventory. The rules were not bent to match; the test asserts classification. If Dan wants てかず treated as a reading of 手数 in its own right (訓訓, ubiquitous in お手数), that is a data question — an alternate for 手数 — not a grading one. Ask 1.
- **The prototype excludes 熟字訓 from prediction, not three-character compounds.** Built as the brief specifies: 熟字訓 in the pool as whole-word items (rule 4's 大人 case), three-character compounds out.
- **The prototype's hint phase shows each on-type character's on inventory** (`音: ガク`). The brief's card shows only the classification hint, so the inventory is not shown before the answer; it appears in the reveal. Ask 2.
- **There is no kana value for `inputmode`.** The field uses `inputMode="text"` with `lang="ja"`, `autocomplete/autocapitalize/autocorrect` off and `enterkeyhint="done"`; which keyboard Android opens is up to Gboard's language settings — Dan's checkpoint tells us.
- **`main`'s latest commit was "Record Dan's phone confirmation of the Chain Explorer checkpoint"**, after the Tailwind fix. Harmless.
- **Node is 22.22.2** in this environment (brief: 20+); the Pages workflow still builds on 20.
- **The Session 3 screenshot procedure was not in the repo**, so "rerun Session 3's list" meant re-deriving it from the file names; the list is now `SESSION_3` in the script.

## The stack as observed

- Vite 7 / React 19 / TypeScript 5.9 / Tailwind 4 / Vitest 3; `playwright-core` 1.58.2 driving `/opt/pw-browsers/chromium` (build 1194) through `executablePath`; Vite's `preview()` API serves `dist/` for the renders.
- The compact form is enough for both drills: `chars[].on` / `.kun` are the inventories, `alternates[].status` the acceptance rule, `tags` the exclusion; no data change was needed and none was made.
- For every decomposable entry, `reading` equals the concatenation of `chars[].r` (checked on the file) — the okurigana of 気持ち, 揚げ物, 夕暮れ etc. is already inside the last character's `r`. The segmenter relies on this.
- The GitHub proxy blocks `isleofdan.github.io` and the artifact host as in Session 3; deploys are checked through the build job's log, which lists the uploaded asset names (Vite names bundles by content).

## Deliberate divergences

- **No position counter and no percentage.** The prototype shows `idx / N` and `x/y (z%)`; both are progress indicators, which §8 puts out of scope beyond the tally. The tally shows counts only, only the nonzero ones. DO NOT REVERSE without a decision from Dan.
- **The answer buttons and the input sit in a fixed bar above the tab bar** (`src/ui/FixedBottom.tsx`), not inline under the card as in the prototype — thumb reach (§5 rule 9 and 1.5). The reveal scrolls under it.
- **The filter chips fold behind 絞り込み** and open by themselves when a filter is active. Fifteen chips always open would push the card below the fold at 380 px.
- **The prediction hint spells the classification out per character** (音/訓 under each kanji), which is what the badge means; no inventories before the answer (see "What the brief got wrong").
- **`EntryReveal` is extracted from `ChainCard`** and shared by the chain card and both drills; the chain card's render is pixel-identical (checked). DO NOT REVERSE.
- **Miss-cause priority when two characters miss differently:** classification, then inventory, then phonetic — the deeper cause names the miss; every character's own line is still shown.
- **The い-adjective stem** (あかい → あか) is a grading candidate beyond the validator's §7.5 stem rule. It only affects how a miss is named, never what is accepted; the validator is unchanged.
- **More labels went Japanese than the six named** (status labels, card and Browse field labels) — §9.5 asks that no English label remain. Prose was left alone. Ask 3.
- **The screenshot walk to a named compound goes through the classification filter** (`#/predict?cls=on_on` for 施行), so the tally it leaves is short; those shots therefore show an active filter chip.
- **`predict-miss` types a Latin "x"** to show 部分一致なし; the named-compound shots show the real causes.
- **A 不正解 on a 熟字訓 in the drill shows the whole-word line once**, not twice (the mechanism line is skipped for that case).

## Dan's decisions this session

None were needed mid-session; the brief pre-decided the labels (Session 3 ask 2), the toggle (ask 3) and the tooling (ask 4), and all were applied as written. No decisions list from the study project appeared in the repo; nothing from the cargo document was applied.

## What the next brief needs to contain

- **Phase 2 starts only after** Dan's checkpoint below and after the study project's cargo answers are back and applied (consolidation, named patches in `scripts/fixes.ts`, a migration row each).
- **Where to start:** the `compound-readings` repository — say "attach and clone it first" as a rule, not an if — branch `session-5-persistence`, `main` at this session's close-out commit.
- **The state that Phase 2 persists** already has a shape: `DrillState` in `src/modes/ClassificationDrill.tsx` and `PredictState` in `src/modes/PredictionChallenge.tsx` (queue, current answer, tally), held in `src/App.tsx` like `RevealState`. The typed wrapper (2.1) must key them under a user identifier from the first line.
- **The grading result** (`GradeResult` in `src/modes/predict/grade.ts`) carries `outcome`, `cause` and per-character `chars[]` — the per-entry accuracy of 2.2 can record the cause, which is the signal the honest assessment asked for.
- **The answers to asks 1–3 below**, and Dan's phone verdict.

## Asks

Dan-preference or Dan-only-knows items only.

1. **てかず.** Keep the rule-consistent 分類の誤り, or add てかず as a documented alternate of 手数 (訓訓, standard in お手数) so it grades 別読みで正解? Recommended answer: keep the grading as is, and put the alternate question to the study project as a data item.
2. **Inventories before the answer.** The prototype showed on-type characters' on readings in the hint; the site does not. Recommended answer: keep them hidden — the inventory is one of the three things Prediction Challenge tests, and the reveal shows it.
3. **The remaining English prose** (listed under "Labels are Japanese"). Recommended answer: switch the sentences to Japanese in one small pass next session, keeping the two tab hints.

## For Dan to tap

Open this on your phone:

```
https://isleofdan.github.io/compound-readings/
```

1. **分類** tab (second from the left, bottom bar). Do twenty in a row, one-handed: tap one of the five buttons at the bottom, read the answer, tap 次へ. Does anything break, is the furigana readable, and did every wrong answer tell you *why* — a line naming the character (場 = ば はここでは訓、音ではない)?
2. **予想** tab (third). Do ten. Type the reading in kana and tap 答える. Make sure one of them is **施行** typed as せこう or **代替** typed as だいがえ: it should say **別読みで正解** with the reading's status, never 不正解. (Tap リセット and keep going if they don't come up; or open the 絞り込み chips and pick 音音 to shorten the pool.)
3. At least one miss: does the line under 分類の誤り / 読みの誤り / 音変化の誤り name a cause you agree with?
4. Did anything ask you to come back tomorrow, show a streak, or a percentage?

Tell me which items did not hold — and the question that matters: **was the miss-cause line useful, or noise?**

## Deploys

- **Run 17** (https://github.com/isleofdan/compound-readings/actions/runs/34023214878), `main` at `d1faeac` ("Add session 4 screenshots"): build and deploy both passed; the build log archived `assets/index-0c0lKk35.js` and `assets/index-B4WszdAl.css` — the local build's names at that commit, byte for byte the same bundles. The proxy still blocks `isleofdan.github.io` and the artifact host, so the log is the check.
- **Run 18** carries this close-out (Markdown only); with the Tailwind scan restricted to `src/` and `index.html`, its asset names are expected to equal run 17's. Its result is stated in the chat close-out.
