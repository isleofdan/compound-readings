# Field report — Compound Readings, Session 3

To: the Personal Shipyard chat (author of `START-HERE.md`, 2026-09-06, "Session 3: Chain Explorer")
From: the Claude Code cloud session that ran it, 2026-09-06

## What stands

- **Chain Explorer is live** at https://isleofdan.github.io/compound-readings/ — the 鎖 tab. It offers exactly the lesson chains the data produces: **手 (9 entries, Rule), 場 (9, Usually), 夕 (4, Rule), 毎 (5, Rule)**, in that order; 目 (no entries) and the 25 `rule_reliability: "none"` rows are never offered. A chain screen walks `entry_order`: each card shows compound, reading and `context`; a tap reveals the classification badge, per-character readings with type, phonetic change and detail, alternates with status, the trap note and the contested note. "Reveal all" / "Hide all" and "← Chains" sit in a row just above the tab bar. The rule panel (rule text, *Rule* or *Usually*, the exception named) appears only once every card is revealed. 場 ends on 場所; 手 ends on 手段, bordered red and badged *Exception*, and the rule panel names it.
- **The shell.** Bottom tab bar with 鎖 and 検索; every tab is `flex-1`, so drill and predict drop in next session by adding two rows to `TABS` in `src/ui/TabBar.tsx` and two cases to the `Route` union in `src/router.ts`. Hash routes `#/chains`, `#/chains/手`, `#/browse`, `#/browse?q=場` (also `cls`, `pc`, `open`); an empty hash lands on `#/chains`; reload lands on the same screen. No `localStorage`; revealed cards live in the app shell's memory and survive a tab switch (checked in Chromium: reveal 手紙, go to Browse, come back — still revealed).
- **Browse** (検索) is the Session 2 inspection page, behavior unchanged, with the entry count and the imbalance sentence moved into its header and its state in the URL. 峠, 朝寝坊 and 大人 open without error.
- **Contested readings** are one shared component (`src/ui/ContestedReadings.tsx`) used by both the chain card and Browse: every `alternate_readings[]` row with its mapped status label, the source's status text in smaller type, its classification and context, the contested note beneath; no reading marked as the answer. Tested with 施行, 代替, 毎月, 明日 by rendering to HTML in Vitest.
- **The data layer** (`src/data/index.ts`): the compact dataset loaded once; `ALL_CHAINS` / `LESSON_CHAINS` from `data/chains.json` with `entry_order` and `exceptions` resolved; `isLesson` (reliability not `none` and at least three entries); indices by classification, difficulty, phonetic change and by every kanji in every compound (all 168 entries reachable); `displayReadingTypes` handling 熟字訓, one and three kanji. 18 new tests; **101 tests green**; `npm run validate` 0 ERRORs / 17 WARNs; `npm run build` green.
- **The cargo document for the study project:** `reports/cargo-for-study-project-2026-09-06.md`. Direct link:

  ```
  https://github.com/isleofdan/compound-readings/blob/main/reports/cargo-for-study-project-2026-09-06.md
  ```

  The session attached this file to Dan directly in the chat, labeled for the study project, so no download step is needed; the link is for reference. (Do not re-issue a "download raw file" instruction to Dan — a session that holds a file attaches it.) It holds the 17 WARNs grouped, the four outliers, the 16 self-correction fields verbatim, the empty 目 chain, the three prototype-only compounds and the candidate tags, each with a recommended answer. Nothing from it was applied; no tag was applied.
- **Session 2 decisions applied:** `exceptions` added to the chain schema (optional) and set to `["cr_0111"]` on 手; "prescriptively contested" added to the `variant_spreading` row of `DATA_SPEC.md` §7.3 and consolidation rerun — 施行 せこう is now `variant_spreading`, `contested` stays true; `CLAUDE.md` §2 and §5 each carry the 目 sentence; `BUILD_PLAN.md` 0.7 says eight; `DATA_SPEC.md` §1 names the `.jsx`; §4.4 lists the compact fields the round-trip test covers. The migration report changed in the 施行 status row, the rule-label text on its three sibling rows (the row's label now includes the new string), the "Unmatched strings" count (1 → 0) and 施行's line in the contested table — all consequences of the one amendment. `reports/03-index.md` changed in 施行's two lines.
- **Screenshots:** 30 in `reports/screenshots/session-3/`, 15 at 380×915 and 15 at 1280×800, every screen (chain list, 手 before / one revealed / all revealed, 場 before / revealed, 夕 and 毎 revealed, 目 via URL, Browse, 場 search, 施行 / 峠 / 朝寝坊 / 大人 open). Each render checked: `scrollWidth` equals the viewport at 380 px, console clean.
- **`main` updated.** Fast-forward merge of `session-3-chain-explorer` (six commits, then the close-out, then one fix), pushed. Pages runs 12, 13 and 14 passed both jobs (run 12: https://github.com/isleofdan/compound-readings/actions/runs/34018447671). This session's proxy blocks `isleofdan.github.io` and the artifact's download host, so each deployed artifact was checked through its run's build log, which lists the uploaded asset names; Vite names bundles by content, so the same name means the same bytes. Run 12 uploaded `index-DoEGbsxz.js` / `index-BJGYQ84L.css`, the local build's names. Run 13 (the close-out, Markdown only) uploaded *different* names — because Tailwind v4 scans every project file for class names, and this report's prose mentions utility names; rebuilding locally at that commit reproduced run 13's names exactly. The scan is now restricted to `src/` and `index.html` (`src/index.css`), so Markdown can no longer change the bundle; the renders before and after that change are byte-identical. Run 14 carries that fix; its asset names and the local build's are stated in the chat close-out. Dan's phone check below is the live confirmation.
- `git status` clean; nothing unpushed.

## What the brief got wrong

Facts the next brief must carry.

- **The cloud session did not open in `compound-readings`.** It opened in `isleofdan/ClaudeTesting` with a designated branch there; the repo had to be attached and cloned (`/home/user/compound-readings`) before §6 could run. Everything else in §6 held. The next brief should either start the session from the `compound-readings` repository or say the repo must be attached first.
- **The latest commit on `main` was not Session 2's close-out** but "Record Dan's phone confirmation of the Phase 0 checkpoint", which came after it. Harmless.
- **The compact form did not carry `source_status`.** Step 5 shows it, so the transform now emits `alternates[].sourceStatus`, the round-trip test covers it, and §4.4 lists it.
- **The prototype hides the reading until the tap; the brief's card shows it before the tap.** Built as the brief specifies (compound, reading, context visible; classification hidden). Ask 1 below.
- **The prototype's chain list shows the classifications present in each chain; the brief's list shows character, count and reliability only.** Built as the brief specifies — badges on the list would front-load the lesson.
- **The prototype's "Reveal all" is at the top; the brief puts it at the bottom.** Built at the bottom, as a toggle ("Hide all"), as in the prototype.
- **`git push --dry-run origin HEAD:main` printed "Everything up-to-date"** at the environment check, because HEAD was `main` at that point — a weak proof of pushability. The real push succeeded.
- **The artifact download host is blocked too** (`productionresultssa1.blob.core.windows.net`, 403 from the proxy), not only `isleofdan.github.io`. Verification went through the build job's log, which lists the uploaded asset names.
- **The 17 WARNs are unchanged** by the 施行 amendment (it is a status mapping, not a validator rule), and WARN 17 (手段) stays by design.

## Deliberate divergences

- **`exceptions` is documented in `DATA_SPEC.md` §5.2** (one sentence plus the field in the example), not only in the Zod schema. The spec is where the chain schema is defined; a field the spec does not know is a drift. DO NOT REVERSE.
- **`alternates[].sourceStatus` in the compact form**, derived one-to-one from `source_status`, covered by the round-trip test, listed in §4.4. DO NOT REVERSE.
- **The validator's judgment-flag table gained a "Decided" column.** Each flag the Session 3 brief ruled on keeps its text and carries a dated decision line in `scripts/validate.ts`, so `reports/02-flagged.md` §6 shows both the question and the ruling instead of stale advice. New flags default to "open".
- **A new §7.6 WARN, "exception not in entry_order"**, so an `exceptions` id that is not a member is caught. Zero today.
- **The router checks `cls` and `pc` against the label tables, not the Zod schema.** Importing the schema into the app pulled Zod into the bundle (341 → 437 kB); with the label tables it is 360 kB. The app still imports only types from `schema.ts`.
- **`<link rel="icon" href="data:,">` in `index.html`.** The browser's automatic favicon request returned 404 and dirtied the console; the empty inline icon makes "clean console" true.
- **Browse keeps its chips and the open entry in the URL** (`cls`, `pc`, `open`) beyond the brief's `q`, so "every state addressable by URL" holds for Browse too; typing and chip taps use `replaceState`, so the Back button does not walk through keystrokes. Its heading reads "Browse" instead of "data inspection".
- **`#/chains/物`, `#/chains/目` or any non-lesson character** render a one-line explanation (list-not-lesson, or no entries yet) with a link to that character in Browse, rather than a blank screen.
- **The Reveal control is a full-width button on the card**, 44 px tall, instead of the prototype's small centered button — thumb reach.
- **Screenshots are viewport captures, not full-page.** Playwright's full-page capture draws the fixed bars mid-image; the revealed-chain shots are scrolled to the bottom so the last card and the rule panel are in frame with the bars where they belong.
- **`src/modes/.gitkeep` and `src/ui/.gitkeep` removed** now that both folders have files.
- **Tailwind's source scan is restricted to `src/` and `index.html`** (`@import "tailwindcss" source(none)` plus two `@source` lines in `src/index.css`). Found when the close-out commit changed the deployed bundle's hash; see "`main` updated". DO NOT REVERSE.
- **The screenshot tooling is not in the repo.** `playwright-core` was installed in the session's scratch folder and driven with the pre-installed Chromium; no dependency was added to `package.json`. Ask 4.

## Dan's decisions this session

None were needed mid-session; every decision was pre-made in the brief (§5 rules 1–8) and applied as written.

## What the next brief needs to contain

- **Where to start:** the `compound-readings` repository (or "attach and clone it first"), branch `session-4-drills`, `main` at this session's close-out commit.
- **The two new tabs:** add `drill` and `predict` to `TABS` in `src/ui/TabBar.tsx` and to the `Route` union in `src/router.ts`; routes `#/drill`, `#/predict`. Session state (current item, answers) in memory in the app shell, the way `RevealState` is held in `src/App.tsx`.
- **Drill rules already in code:** `isUnclassifiable(entry)` in `src/data/index.ts` for the exclusion; `alternates[].status !== "nonstandard"` for grading (`DATA_SPEC.md` §7.3); `displayReadingTypes` for the reveal; `ContestedReadings` for alternates; the labels in `src/data/labels.ts` (`RELIABILITY_LABELS`, `ALTERNATE_STATUS_LABELS`, `EXCEPTION_LABEL`).
- **The honest-assessment point** that a prediction miss has three causes (classification, inventory, phonetic change) — decide whether Prediction Challenge surfaces which, before it is built.
- **The answers to the asks below**, and any answers that came back from the study project on the cargo document (applied by consolidation as named patches in `scripts/fixes.ts` with a migration row each).
- **Dan's phone verdict** on the checkpoint items below, especially the one question.

## Asks

Dan-preference or Dan-only-knows items only.

1. **Reading visible before the tap.** The brief's card shows compound, reading and context before the tap; the prototype hid the reading. Recommended answer: keep the reading visible in Chain Explorer — the lesson is the reading-*type* shift, and hiding the reading belongs to the drills.
2. **Labels in English or Japanese.** *Rule*, *Usually*, *Exception*, *Reveal*, *Also read* are English; the tabs and classifications are Japanese. Recommended answer: Japanese (規則 / だいたい / 例外 / 開く / 別読み) — a one-line change per label in `src/data/labels.ts` next session, if Dan prefers it after using the English version once.
3. **"Hide all" as the second state of "Reveal all"** (the prototype's toggle) — keep, or make "Reveal all" one-way? Recommended answer: keep the toggle.
4. **Screenshot tooling in the repo.** Recommended answer: add `playwright-core` as a devDependency and a `scripts/screenshots.mjs` next session so every session's screenshots are produced the same way; until then the procedure is in this report.

## For Dan to tap

Open this on your phone:

```
https://isleofdan.github.io/compound-readings/
```

1. The **鎖** tab (bottom left) lists **手, 場, 夕, 毎** and nothing else — four tiles, each with a count and *Rule* or *Usually*.
2. Tap **手** and reveal one card at a time, top to bottom: **手紙, 手間** show **訓訓**; **切手, 新手** also 訓訓; **手本, 手帳, 手数, 手配** show **湯桶**; **手段** comes last with a red **Exception** badge. Only after the last reveal does a **手 · Rule** panel appear at the bottom, naming 手段 as the exception.
3. Go back (**← Chains**) and walk **場** the same way. Does the shift land — ジョウ in 入場, 会場, 工場, then ば from 職場 onward — and does **場所** as the last card feel like the payoff? The panel that follows says **Usually**, not Rule.
4. Walk **夕**: the reveals show **湯桶** on **夕食** and **夕飯**, and the rule says 夕 stays ゆう.
5. **検索** tab, type **施行**, tap it: three readings — しこう, せこう, せぎょう — each with a status, none marked correct.
6. All of it one-handed, without zooming, with the buttons at the bottom within reach of your thumb.

Tell me which items did not hold — and the one question that matters: **would you do the 場 chain again tomorrow?**

### Result, 2026-09-06

Walked with Dan on his phone, one item per message. All six items held. Dan first opened the 手 search on the Browse tab instead of the 手 tile on the Chains tab and asked where the Exception label was — the walkthrough wording should say "the 鎖 tab, bottom left, then the 手 tile" on the first step, and the next brief's checkpoint text should too. Once on the chain: "yes, big red exception tag". 場: the shift lands and 場所 is the payoff. 夕: 湯桶 on 夕食 and 夕飯, rule holds. 施行: three readings, none marked correct. One-handed, no zoom: yes. **Would he do the 場 chain again tomorrow: yes.** Phase 1's first-half checkpoint is passed; Session 4 (Classification Drill and Prediction Challenge) is cleared to run.
