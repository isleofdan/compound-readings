// Empirical audit of the source dataset (BUILD_PLAN.md Phase 0, task 0.1).
//
// Run:  npx tsx scripts/audit.ts
// Writes reports/00-audit.md. Every number in that report is computed here from
// the files under data/source/. Nothing is typed by hand except the claims being
// checked (quoted from the planning documents) and the "Corrections made" list
// at the end, which records document edits made after reading the numbers. The
// output carries no timestamp, so re-running the script on unchanged inputs
// produces an identical file.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- inputs

const ROOT = process.cwd();
const SOURCE_DIR = join(ROOT, "data", "source");
const OUT = join(ROOT, "reports", "00-audit.md");

const BATCHES = [
  { batch: 1, file: "compound_readings_data.json" },
  { batch: 2, file: "compound_readings_batch2.json" },
  { batch: 3, file: "compound_readings_batch3.json" },
  { batch: 4, file: "compound_readings_batch4.json" },
] as const;

const PROTOTYPE_FILE = "compound-drill.prototype.jsx";

// Document edits made in Session 1 after reading this audit's numbers. Static
// text by design: the report must list them, and the report must be reproducible.
const CORRECTIONS: string[] = [
  "`BUILD_PLAN.md`, Status of inputs table: batch 4 row said 49 entries [T]; corrected to 42 [V]. Batch 2 (50) and batch 3 (46) rows upgraded from [T] to [V] as confirmed.",
  "`BUILD_PLAN.md`, Index coverage paragraph: \"Batch 4's 49 entries\" corrected to 42.",
  "`BUILD_PLAN.md`, task 0.1: \"Total across four batches ≈ 175 [T]\" corrected to 168 [V], with the origin of the 175 figure (batch 4's header string) noted.",
  "`BUILD_PLAN.md`, task 0.1: batches 1–3 split 音音 35 / 訓訓 27 / 重箱 20 / 湯桶 21 / 熟字訓 21 / irregular 2 corrected to 38 / 32 / 19 / 18 / 18 / 1 = 126 [V].",
  "`BUILD_PLAN.md`, task 0.1: \"Cross-batch ID collisions (batch 3 reached juubako_86; batch 4 opens at juubako_25) [T]\" corrected: no collisions, all 168 IDs unique; batch 3's highest juubako_ number is 24; juubako_86 was the discarded batch 5's truncation point; batch 4 does open at juubako_25.",
  "`BUILD_PLAN.md`, Phase 3: \"[T: 20 vs 35 across batches 1–3]\" corrected to \"[V: 25 vs 53 across all four batches; 19 vs 38 in batches 1–3]\".",
  "`CLAUDE.md` §5: \"連濁 … roughly 30 entries\" corrected to 24 entries carrying the token.",
  "`CLAUDE.md` §6 defect 2: \"Cross-batch ID collisions are likely … batch 3 reached juubako_86\" rewritten to record that the audit found none, with the corrected facts; canonical ID reassignment stays.",
  "`DATA_SPEC.md` §6: one paragraph added under the code table recording the token spellings actually present in the files, including the prototype's `半濁音`, which the table did not name (the only edit made to `DATA_SPEC.md`).",
];

// Contradictions found in files this session was not allowed to edit. Listed so
// the next session can act on them.
const NOT_CORRECTED: string[] = [
  "`DATA_SPEC.md` §4.3 item 2 says \"Batch 3 reached juubako_86; batch 4 opens at juubako_25. Collisions are near-certain.\" — the audit found 0 duplicates and a batch 3 maximum of juubako_24. Left as is (DATA_SPEC.md edits limited to the token mapping this session).",
  "`DATA_SPEC.md` §6 says \"連濁 is the largest cluster (~30 entries); 促音 has around six\" — the files carry rendaku on 24 entries and sokuon on 9. Left as is for the same reason.",
  "`reports/00-recovery.md` says \"2 of 163\" derivation violations and lists 18 chain characters; the audit counts 2 stale-field violations plus 2 `irregular` entries, and 27 kanji in three or more compounds. The recovery report is read-only history and is not edited.",
  "`BUILD_PLAN.md` task 0.7 says \"Fix the six known defects\" while `CLAUDE.md` §6 lists eight. Not a dataset number; left for the next brief to reconcile.",
];

type Char = {
  kanji?: string;
  reading_in_compound?: string | null;
  reading_type?: string;
  on_readings?: string[];
  kun_readings?: string[];
  reading_note?: string | null;
};

type Entry = {
  id?: string;
  compound?: string;
  reading?: string;
  characters?: Char[];
  classification?: string;
  phonetic_changes?: string[];
  phonetic_change_detail?: string | null;
  difficulty?: number;
  difficulty_rationale?: string;
  real_world_context?: string;
  trap_note?: string | null;
  alternate_readings?: unknown[];
  [key: string]: unknown;
};

type Loaded = {
  batch: number;
  file: string;
  parsed: boolean;
  parseError: string | null;
  topLevelKeys: string[];
  entries: Entry[];
};

type ProtoChar = { k: string; r: string; t: string };
type ProtoEntry = {
  id: string;
  compound: string;
  reading: string;
  chars: ProtoChar[];
  cls: string;
  diff: number;
  changes: string[];
  changeDetail: string | null;
  context: string;
  trap: string | null;
  chains: string[];
  altReadings?: { reading: string; cls: string; note: string }[];
};

type Row = { batch: number; e: Entry };

// ---------------------------------------------------------------- helpers

const CLS_DISPLAY: Record<string, string> = {
  on_on: "音音",
  kun_kun: "訓訓",
  juubako: "重箱",
  yutou: "湯桶",
  jukujikun: "熟字訓",
};

const CLS_ORDER = ["on_on", "kun_kun", "juubako", "yutou", "jukujikun"];

function display(cls: string): string {
  return CLS_DISPLAY[cls] ? `${CLS_DISPLAY[cls]} (${cls})` : `\`${cls}\``;
}

function countBy<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function sortedKeys(m: Map<string, number>, order?: string[]): string[] {
  const keys = [...m.keys()];
  if (!order) return keys.sort();
  return keys.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Katakana to hiragana so ジョウ and じょう compare equal. */
function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function derive(t1: string | undefined, t2: string | undefined): string | null {
  if (t1 === "on" && t2 === "on") return "on_on";
  if (t1 === "kun" && t2 === "kun") return "kun_kun";
  if (t1 === "on" && t2 === "kun") return "juubako";
  if (t1 === "kun" && t2 === "on") return "yutou";
  return null;
}

/** "juubako_56" -> "juubako"; "on_on_01" -> "on_on". */
function idPrefix(id: string): string {
  return id.replace(/_\d+$/, "");
}

const PREFIX_TO_CLS: Record<string, string> = {
  on_on: "on_on",
  kun_kun: "kun_kun",
  juubako: "juubako",
  yutou: "yutou",
  jukujikun: "jukujikun",
};

function md(s: unknown): string {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function verdict(ok: boolean): string {
  return ok ? "CONFIRMED" : "REFUTED";
}

function chars(e: Entry): Char[] {
  return e.characters ?? [];
}

function changes(e: Entry): string[] {
  return e.phonetic_changes ?? [];
}

// ---------------------------------------------------------------- load

function loadBatch(batch: number, file: string): Loaded {
  const text = readFileSync(join(SOURCE_DIR, file), "utf8");
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const hasEntries = Array.isArray(parsed.entries);
    return {
      batch,
      file,
      parsed: true,
      parseError: hasEntries ? null : 'no top-level "entries" array',
      topLevelKeys: Object.keys(parsed),
      entries: hasEntries ? (parsed.entries as Entry[]) : [],
    };
  } catch (e) {
    return { batch, file, parsed: false, parseError: String(e), topLevelKeys: [], entries: [] };
  }
}

function loadPrototype(): { entries: ProtoEntry[]; error: string | null } {
  const text = readFileSync(join(SOURCE_DIR, PROTOTYPE_FILE), "utf8");
  const open = "const ENTRIES = [";
  const start = text.indexOf(open);
  if (start === -1) return { entries: [], error: `"${open}" not found` };
  // The array closes at the first "];" that starts a line after the opener.
  const close = text.indexOf("\n];", start);
  if (close === -1) return { entries: [], error: '"];" closing the ENTRIES array not found' };
  const body = text.slice(start + open.length, close);
  try {
    // The body is a JavaScript array literal (unquoted keys, trailing commas,
    // line comments), not JSON, so it is evaluated as an expression. The React
    // file itself is never imported.
    const arr = new Function(`"use strict"; return [${body}\n];`)() as ProtoEntry[];
    return { entries: arr, error: null };
  } catch (e) {
    return { entries: [], error: String(e) };
  }
}

// ---------------------------------------------------------------- audit

const batches = BATCHES.map((b) => loadBatch(b.batch, b.file));
const all: Row[] = batches.flatMap((b) => b.entries.map((e) => ({ batch: b.batch, e })));
const total = all.length;
const proto = loadPrototype();

const lines: string[] = [];
const L = (s = "") => lines.push(s);

L("# 00-audit.md — Empirical audit of the source dataset");
L();
L("Generated by `scripts/audit.ts` (`npx tsx scripts/audit.ts`). Every number below is");
L("computed from the files under `data/source/`. Re-running the script on unchanged");
L("inputs reproduces this file byte for byte. Claims quoted from the planning documents");
L("are labelled as such; the computed value beside each is the authority.");
L();
L("Source files are read-only. This audit lists; it changes nothing in `data/source/`.");
L();

// ---- 1. Per file
L("## 1. Per file");
L();
for (const b of batches) {
  L(`### Batch ${b.batch} — \`${b.file}\``);
  L();
  L(`- Parse status: ${b.parsed ? "parses" : "PARSE FAILURE"}${b.parseError ? ` — ${b.parseError}` : ""}`);
  L(`- Top-level keys: ${b.topLevelKeys.map((k) => `\`${k}\``).join(", ")}`);
  L(`- Entry count: **${b.entries.length}**`);
  L();

  const fieldCounts = new Map<string, number>();
  for (const e of b.entries) for (const k of Object.keys(e)) fieldCounts.set(k, (fieldCounts.get(k) ?? 0) + 1);
  const charFieldCounts = new Map<string, number>();
  let charObjects = 0;
  for (const e of b.entries)
    for (const c of chars(e)) {
      charObjects++;
      for (const k of Object.keys(c)) charFieldCounts.set(k, (charFieldCounts.get(k) ?? 0) + 1);
    }
  L("Entry-level fields (presence count out of entry count):");
  L();
  L("| Field | Present on | Note |");
  L("|---|---|---|");
  for (const k of sortedKeys(fieldCounts)) {
    const n = fieldCounts.get(k)!;
    L(`| \`${k}\` | ${n} / ${b.entries.length} | ${n === b.entries.length ? "" : "**only some entries**"} |`);
  }
  L();
  L(`Character-level fields (presence count out of ${charObjects} character objects):`);
  L();
  L("| Field | Present on | Note |");
  L("|---|---|---|");
  for (const k of sortedKeys(charFieldCounts)) {
    const n = charFieldCounts.get(k)!;
    L(`| \`${k}\` | ${n} / ${charObjects} | ${n === charObjects ? "" : "**only some characters**"} |`);
  }
  L();

  const cls = countBy(b.entries, (e) => String(e.classification));
  L("Classification distribution:");
  L();
  L("| Classification | Count |");
  L("|---|---|");
  for (const k of sortedKeys(cls, CLS_ORDER)) L(`| ${display(k)} | ${cls.get(k)} |`);
  L(`| **Total** | **${b.entries.length}** |`);
  L();

  L("IDs, in file order:");
  L();
  L(b.entries.map((e) => `\`${e.id}\``).join(", "));
  L();
}

// ---- 2. Across files
L("## 2. Across all four files");
L();
L(`- Total entries: **${total}** (${batches.map((b) => b.entries.length).join(" + ")})`);
L();

const idCount = countBy(all, (x) => String(x.e.id));
const dupIds = [...idCount.entries()].filter(([, n]) => n > 1).sort();
L(`### 2.1 Duplicate IDs across files: ${dupIds.length}`);
L();
if (dupIds.length === 0) L(`All ${total} IDs are unique.`);
else {
  L("| ID | Occurrences | Batches |");
  L("|---|---|---|");
  for (const [id, n] of dupIds)
    L(`| \`${id}\` | ${n} | ${all.filter((x) => x.e.id === id).map((x) => x.batch).join(", ")} |`);
}
L();

const prefixMismatch = all.filter((x) => {
  const expected = PREFIX_TO_CLS[idPrefix(String(x.e.id))];
  return expected !== undefined && expected !== x.e.classification;
});
const unknownPrefix = all.filter((x) => PREFIX_TO_CLS[idPrefix(String(x.e.id))] === undefined);
L(`### 2.2 ID prefix contradicts classification: ${prefixMismatch.length} of ${total}`);
L();
L("Prefixes recognized: " + Object.keys(PREFIX_TO_CLS).map((p) => `\`${p}_NN\``).join(", ") + ".");
if (unknownPrefix.length)
  L(
    `Entries whose ID prefix is none of these (not counted as mismatches): ${unknownPrefix
      .map((x) => `\`${x.e.id}\` (${x.e.compound}, ${display(String(x.e.classification))})`)
      .join(", ")}.`,
  );
L();
L("| Batch | ID | Compound | Reading | Prefix says | Classification says |");
L("|---|---|---|---|---|---|");
for (const x of prefixMismatch)
  L(
    `| ${x.batch} | \`${x.e.id}\` | ${x.e.compound} | ${x.e.reading} | ${display(PREFIX_TO_CLS[idPrefix(String(x.e.id))])} | ${display(String(x.e.classification))} |`,
  );
L();

const twoChar = all.filter((x) => chars(x.e).length === 2);
const twoCharDecomposable = twoChar.filter((x) => x.e.classification !== "jukujikun");
const allDerivMismatches = twoCharDecomposable.filter((x) => {
  const [c1, c2] = chars(x.e);
  return derive(c1.reading_type, c2.reading_type) !== x.e.classification;
});
// A mismatch where the recorded classification is one of the four decomposable
// framework values is a stale field. One where it is outside the enum (the
// retired `irregular`) is a classification decision still to be made (§3 of
// DATA_SPEC.md), so the two kinds are reported separately.
const derivViolations = allDerivMismatches.filter((x) => CLS_ORDER.includes(String(x.e.classification)));
const derivOutsideEnum = allDerivMismatches.filter((x) => !CLS_ORDER.includes(String(x.e.classification)));
L(
  `### 2.3 Classification-derivation violations (two-character, 熟字訓 excluded): ${derivViolations.length} of ${twoCharDecomposable.length}, plus ${derivOutsideEnum.length} classified outside the enum`,
);
L();
L(
  `Of ${twoChar.length} two-character entries, ${twoChar.length - twoCharDecomposable.length} are 熟字訓 and excluded, leaving ${twoCharDecomposable.length}. Per \`DATA_SPEC.md\` §7.2 the pair of \`reading_type\` values must imply the classification (on+on → 音音, kun+kun → 訓訓, on+kun → 重箱, kun+on → 湯桶).`,
);
L();
L("Recorded classification is a framework value but contradicts the reading types (stale field):");
L();
L("| Batch | ID | Compound | Reading | reading_type pair | Derived | Recorded |");
L("|---|---|---|---|---|---|---|");
for (const x of derivViolations) {
  const [c1, c2] = chars(x.e);
  const d = derive(c1.reading_type, c2.reading_type);
  L(
    `| ${x.batch} | \`${x.e.id}\` | ${x.e.compound} | ${x.e.reading} | ${c1.reading_type} + ${c2.reading_type} | ${d ? display(d) : "(none — a value is not on/kun)"} | ${display(String(x.e.classification))} |`,
  );
}
L();
L("Recorded classification is outside the five framework values, so no pair can imply it (a decision for consolidation, `DATA_SPEC.md` §3):");
L();
L("| Batch | ID | Compound | Reading | reading_type pair | Derived | Recorded |");
L("|---|---|---|---|---|---|---|");
for (const x of derivOutsideEnum) {
  const [c1, c2] = chars(x.e);
  const d = derive(c1.reading_type, c2.reading_type);
  L(
    `| ${x.batch} | \`${x.e.id}\` | ${x.e.compound} | ${x.e.reading} | ${c1.reading_type} + ${c2.reading_type} | ${d ? display(d) : "(none — a value is not on/kun)"} | ${display(String(x.e.classification))} |`,
  );
}
L();

const juku = all.filter((x) => x.e.classification === "jukujikun");
const jukuWithTypes = juku.filter((x) => chars(x.e).some((c) => c.reading_type !== "neither"));
L(
  `### 2.4 熟字訓 entries whose characters carry a reading_type other than \`neither\`: ${jukuWithTypes.length} of ${juku.length}`,
);
L();
if (jukuWithTypes.length) {
  L("| Batch | ID | Compound | reading_type values |");
  L("|---|---|---|---|");
  for (const x of jukuWithTypes)
    L(`| ${x.batch} | \`${x.e.id}\` | ${x.e.compound} | ${chars(x.e).map((c) => c.reading_type).join(", ")} |`);
  L();
}
const neitherOutsideJuku = all.filter(
  (x) => x.e.classification !== "jukujikun" && chars(x.e).some((c) => c.reading_type === "neither"),
);
L(
  `Non-熟字訓 entries using \`neither\`: ${neitherOutsideJuku.length}${
    neitherOutsideJuku.length
      ? " — " +
        neitherOutsideJuku
          .map((x) => `\`${x.e.id}\` ${x.e.compound} (${display(String(x.e.classification))})`)
          .join(", ")
      : ""
  }.`,
);
L();

const clsAll = countBy(all, (x) => String(x.e.classification));
L("### 2.5 Distinct `classification` values");
L();
L("| Value | Count |");
L("|---|---|");
for (const k of sortedKeys(clsAll, CLS_ORDER)) L(`| ${display(k)} | ${clsAll.get(k)} |`);
L(`| **Total** | **${total}** |`);
L();
L("Per batch:");
L();
L("| Classification | " + batches.map((b) => `Batch ${b.batch}`).join(" | ") + " | Total |");
L("|---|" + batches.map(() => "---|").join("") + "---|");
for (const k of sortedKeys(clsAll, CLS_ORDER)) {
  const per = batches.map((b) => b.entries.filter((e) => String(e.classification) === k).length);
  L(`| ${display(k)} | ${per.join(" | ")} | ${clsAll.get(k)} |`);
}
L(`| **Total** | ${batches.map((b) => `**${b.entries.length}**`).join(" | ")} | **${total}** |`);
L();
const nonFramework = all.filter((x) => !CLS_ORDER.includes(String(x.e.classification)));
L(
  `Entries outside the five framework values: ${nonFramework.length}${
    nonFramework.length
      ? " — " +
        nonFramework
          .map((x) => `\`${x.e.id}\` ${x.e.compound} ${x.e.reading} (\`${x.e.classification}\`, ${chars(x.e).length} characters)`)
          .join("; ")
      : ""
  }.`,
);
L();

const rtAll = countBy(
  all.flatMap((x) => chars(x.e)),
  (c) => String(c.reading_type),
);
L("### 2.6 Distinct `reading_type` values (over all character objects)");
L();
L("| Value | Count |");
L("|---|---|");
for (const k of sortedKeys(rtAll)) L(`| \`${k}\` | ${rtAll.get(k)} |`);
L();

const pcAll = countBy(
  all.flatMap((x) => changes(x.e)),
  (t) => String(t),
);
const entriesWithChanges = all.filter((x) => changes(x.e).length > 0).length;
L("### 2.7 Distinct `phonetic_changes` tokens");
L();
L(`Entries with at least one token: ${entriesWithChanges}. Entries with an empty array: ${total - entriesWithChanges}.`);
L();
L("| Token | Occurrences |");
L("|---|---|");
for (const k of sortedKeys(pcAll)) L(`| \`${k}\` | ${pcAll.get(k)} |`);
L();

const withAlt = all.filter((x) => Array.isArray(x.e.alternate_readings));
L(`### 2.8 Entries with \`alternate_readings\`: ${withAlt.length} of ${total}`);
L();
L(withAlt.map((x) => `\`${x.e.id}\` ${x.e.compound}`).join(", "));
L();
const altStatus = countBy(
  withAlt.flatMap((x) => (x.e.alternate_readings as { status?: string }[]).map((a) => a.status ?? "(no status)")),
  (s) => s,
);
L("Alternate-reading `status` values:");
L();
L("| Status | Count |");
L("|---|---|");
for (const k of sortedKeys(altStatus)) L(`| \`${k}\` | ${altStatus.get(k)} |`);
L();

const charLen = countBy(all, (x) => String(chars(x.e).length));
const compoundLen = countBy(all, (x) => String([...String(x.e.compound)].length));
L("### 2.9 Character-count distribution");
L();
L("| `characters[]` length | Entries |");
L("|---|---|");
for (const k of sortedKeys(charLen)) L(`| ${k} | ${charLen.get(k)} |`);
L();
L("| Code points in `compound` | Entries |");
L("|---|---|");
for (const k of sortedKeys(compoundLen)) L(`| ${k} | ${compoundLen.get(k)} |`);
L();
const notTwo = all.filter((x) => chars(x.e).length !== 2);
L("Entries whose `characters[]` length is not 2:");
L();
L("| Batch | ID | Compound | Reading | characters[] | Classification |");
L("|---|---|---|---|---|---|");
for (const x of notTwo)
  L(
    `| ${x.batch} | \`${x.e.id}\` | ${x.e.compound} | ${x.e.reading} | ${chars(x.e)
      .map((c) => c.kanji)
      .join(" ")} (${chars(x.e).length}) | ${display(String(x.e.classification))} |`,
  );
L();
const joinMismatch = all.filter((x) => chars(x.e).map((c) => c.kanji).join("") !== x.e.compound);
L(
  `Entries where the \`characters[].kanji\` concatenation differs from \`compound\`: ${joinMismatch.length}${
    joinMismatch.length
      ? " — " +
        joinMismatch
          .map((x) => `\`${x.e.id}\` ${x.e.compound} vs ${chars(x.e).map((c) => c.kanji).join("")}`)
          .join(", ")
      : ""
  }.`,
);
L();

type Omission = { batch: number; e: Entry; c: Char };
const omissions: Omission[] = [];
for (const x of all) {
  if (changes(x.e).length !== 0) continue;
  for (const c of chars(x.e)) {
    if (c.reading_type === "neither") continue;
    const ric = c.reading_in_compound;
    if (ric == null) continue;
    const dict = [...(c.on_readings ?? []), ...(c.kun_readings ?? [])].map(toHiragana);
    if (!dict.includes(toHiragana(ric))) omissions.push({ batch: x.batch, e: x.e, c });
  }
}
L(
  `### 2.10 Reading absent from both dictionary lists while \`phonetic_changes\` is empty: ${omissions.length} character(s) in ${new Set(omissions.map((o) => o.e.id)).size} entries`,
);
L();
L(
  "Comparison is after katakana → hiragana normalization. Characters marked `neither` (熟字訓 components) are skipped because their per-character reading is not meaningful. Kun readings are recorded in dictionary form (e.g. やく for 焼き), so some rows are okurigana stems rather than sound changes; each is listed for Dan to judge, none is changed.",
);
L();
L("| Batch | ID | Compound | Kanji | reading_in_compound | on_readings | kun_readings | reading_note |");
L("|---|---|---|---|---|---|---|---|");
for (const o of omissions)
  L(
    `| ${o.batch} | \`${o.e.id}\` | ${o.e.compound} | ${o.c.kanji} | ${o.c.reading_in_compound} | ${
      (o.c.on_readings ?? []).join("・") || "—"
    } | ${(o.c.kun_readings ?? []).join("・") || "—"} | ${md(o.c.reading_note ?? "")} |`,
  );
L();

const isKanji = (ch: string) => /\p{Script=Han}/u.test(ch);
const charFreq = new Map<string, Row[]>();
for (const x of all)
  for (const ch of new Set([...String(x.e.compound)].filter(isKanji))) charFreq.set(ch, [...(charFreq.get(ch) ?? []), x]);
const chainCandidates = [...charFreq.entries()]
  .filter(([, xs]) => xs.length >= 3)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
L(`### 2.11 Kanji appearing in three or more compounds: ${chainCandidates.length}`);
L();
L("Kana inside a compound (the っ of 真っ赤, the み of 気持ち) are not counted as characters here.");
L();
L("| Character | Entries | Classifications spanned | Breakdown | Compounds |");
L("|---|---|---|---|---|");
for (const [ch, xs] of chainCandidates) {
  const bd = countBy(xs, (x) => String(x.e.classification));
  L(
    `| ${ch} | ${xs.length} | ${bd.size} | ${sortedKeys(bd, CLS_ORDER)
      .map((k) => `${CLS_DISPLAY[k] ?? k}×${bd.get(k)}`)
      .join(", ")} | ${xs.map((x) => x.e.compound).join(" ")} |`,
  );
}
L();

// ---- 3. Prototype
L("## 3. The React prototype");
L();
L(
  `Source: \`data/source/${PROTOTYPE_FILE}\`. The \`ENTRIES\` array was extracted from the file text between \`const ENTRIES = [\` and the \`];\` that closes it, and evaluated as a JavaScript array literal. The React file is not imported.`,
);
L();
if (proto.error) L(`**Extraction failed:** ${proto.error}`);
L(`- Prototype entry count: **${proto.entries.length}**`);
L(`- Prototype IDs: ${proto.entries.map((p) => `\`${p.id}\``).join(", ")}`);
L();

const protoFields = new Map<string, number>();
for (const p of proto.entries) for (const k of Object.keys(p)) protoFields.set(k, (protoFields.get(k) ?? 0) + 1);
L("Prototype entry fields (presence count):");
L();
L("| Field | Present on | Note |");
L("|---|---|---|");
for (const k of sortedKeys(protoFields)) {
  const n = protoFields.get(k)!;
  L(`| \`${k}\` | ${n} / ${proto.entries.length} | ${n === proto.entries.length ? "" : "**only some entries**"} |`);
}
L();

const protoCls = countBy(proto.entries, (p) => p.cls);
L("Prototype classification distribution:");
L();
L("| Classification | Count |");
L("|---|---|");
for (const k of sortedKeys(protoCls, CLS_ORDER)) L(`| ${display(k)} | ${protoCls.get(k)} |`);
L();

const protoChanges = countBy(
  proto.entries.flatMap((p) => p.changes ?? []),
  (t) => t,
);
L("Prototype `changes` tokens:");
L();
L("| Token | Occurrences |");
L("|---|---|");
for (const k of sortedKeys(protoChanges)) L(`| \`${k}\` | ${protoChanges.get(k)} |`);
L();

const chainVals = countBy(
  proto.entries.flatMap((p) => p.chains ?? []),
  (c) => c,
);
L(`### 3.1 Prototype \`chains[]\` values: ${chainVals.size} distinct characters`);
L();
L("| Character | Prototype entries carrying it | Compounds |");
L("|---|---|---|");
for (const k of [...chainVals.keys()].sort((a, b) => chainVals.get(b)! - chainVals.get(a)! || a.localeCompare(b)))
  L(
    `| ${k} | ${chainVals.get(k)} | ${proto.entries
      .filter((p) => (p.chains ?? []).includes(k))
      .map((p) => p.compound)
      .join(" ")} |`,
  );
L();
const emptyChains = proto.entries.filter((p) => (p.chains ?? []).length === 0);
L(`Prototype entries with an empty \`chains[]\`: ${emptyChains.length} — ${emptyChains.map((p) => p.compound).join(", ")}.`);
L();

const bySourceKey = new Map<string, Row[]>();
for (const x of all) {
  const k = `${x.e.compound}|${x.e.reading}`;
  bySourceKey.set(k, [...(bySourceKey.get(k) ?? []), x]);
}
type Match = { p: ProtoEntry; matches: Row[] };
const matched: Match[] = proto.entries.map((p) => ({ p, matches: bySourceKey.get(`${p.compound}|${p.reading}`) ?? [] }));
const unmatched = matched.filter((m) => m.matches.length === 0);
const multi = matched.filter((m) => m.matches.length > 1);
L(
  `### 3.2 Prototype entries matched to source on \`compound\` + \`reading\`: ${matched.length - unmatched.length} of ${proto.entries.length}`,
);
L();
L("| Prototype ID | Compound | Reading | Source ID(s) | Source batch |");
L("|---|---|---|---|---|");
for (const m of matched)
  L(
    `| \`${m.p.id}\` | ${m.p.compound} | ${m.p.reading} | ${
      m.matches.length ? m.matches.map((x) => `\`${x.e.id}\``).join(", ") : "**no match**"
    } | ${m.matches.map((x) => x.batch).join(", ") || "—"} |`,
  );
L();
L(
  `Prototype entries with no source match: ${unmatched.length}${
    unmatched.length ? " — " + unmatched.map((m) => `\`${m.p.id}\` ${m.p.compound} ${m.p.reading}`).join(", ") : ""
  }.`,
);
if (unmatched.length) {
  L();
  L("For each unmatched entry, source entries with the same `compound` but a different `reading` (if any):");
  L();
  for (const m of unmatched) {
    const same = all.filter((x) => x.e.compound === m.p.compound);
    L(
      `- \`${m.p.id}\` ${m.p.compound} ${m.p.reading}: ${
        same.length ? same.map((x) => `\`${x.e.id}\` ${x.e.reading}`).join(", ") : "no source entry with this compound"
      }`,
    );
  }
}
L();
L(
  `Prototype entries matching more than one source entry: ${multi.length}${
    multi.length ? " — " + multi.map((m) => `\`${m.p.id}\` ${m.p.compound}`).join(", ") : ""
  }.`,
);
L();

type Disagreement = { p: ProtoEntry; s: Entry; batch: number; field: string; proto: string; source: string };
const disagreements: Disagreement[] = [];
for (const m of matched) {
  for (const x of m.matches) {
    const s = x.e;
    if (m.p.cls !== s.classification)
      disagreements.push({ p: m.p, s, batch: x.batch, field: "classification", proto: m.p.cls, source: String(s.classification) });
    const sChars = chars(s);
    if (m.p.chars.length !== sChars.length) {
      disagreements.push({
        p: m.p,
        s,
        batch: x.batch,
        field: "characters length",
        proto: String(m.p.chars.length),
        source: String(sChars.length),
      });
      continue;
    }
    m.p.chars.forEach((pc, i) => {
      const sc = sChars[i];
      const pt = pc.t === "—" ? "neither" : pc.t;
      const pr = pc.r === "—" ? null : pc.r;
      if (pc.k !== sc.kanji)
        disagreements.push({ p: m.p, s, batch: x.batch, field: `char ${i + 1} kanji`, proto: pc.k, source: String(sc.kanji) });
      if (pt !== sc.reading_type)
        disagreements.push({
          p: m.p,
          s,
          batch: x.batch,
          field: `char ${i + 1} (${pc.k}) reading_type`,
          proto: pt,
          source: String(sc.reading_type),
        });
      const sr = sc.reading_in_compound ?? null;
      const srNull = sr === null || sr === "—" || sr === "";
      if (!(pr === null && srNull) && pr !== sr)
        disagreements.push({
          p: m.p,
          s,
          batch: x.batch,
          field: `char ${i + 1} (${pc.k}) reading_in_compound`,
          proto: String(pr),
          source: String(sr),
        });
    });
  }
}
const clsDis = disagreements.filter((d) => d.field === "classification");
const rtDis = disagreements.filter((d) => d.field.endsWith("reading_type"));
const otherDis = disagreements.filter((d) => !clsDis.includes(d) && !rtDis.includes(d));
L(
  `### 3.3 Prototype vs source disagreements: ${disagreements.length} (classification ${clsDis.length}, reading_type ${rtDis.length}, other ${otherDis.length}) across ${new Set(disagreements.map((d) => d.p.id)).size} prototype entries`,
);
L();
L(
  'Per `DATA_SPEC.md` §4.2 the source (verbose) entry wins. This section lists; nothing is changed. Prototype `t: "—"` is compared as `neither` and `r: "—"` as `null`.',
);
L();
L("| Prototype ID | Compound | Source ID | Batch | Field | Prototype says | Source says |");
L("|---|---|---|---|---|---|---|");
for (const d of disagreements)
  L(
    `| \`${d.p.id}\` | ${d.p.compound} | \`${d.s.id}\` | ${d.batch} | ${d.field} | ${
      d.field === "classification" ? display(d.proto) : d.proto
    } | ${d.field === "classification" ? display(d.source) : d.source} |`,
  );
L();
const baEntries = disagreements.filter((d) => d.field.includes("(場)"));
L(
  `Of these, disagreements about the reading type of 場: ${baEntries.length} — ${
    [...new Set(baEntries.map((d) => d.p.compound))].join(", ") || "none"
  }.`,
);
L();

// ---- 4. 半濁音化
L("## 4. 半濁音化 check");
L();
const HANDAKU_SET = ["散歩", "年俸", "心配", "乾杯"];
const handakuTokenRe = /handaku|半濁/i;
const handakuProseRe = /半濁|パ行|semi-?voic/i;
const byToken = all.filter((x) => changes(x.e).some((t) => handakuTokenRe.test(String(t))));
const byDetail = all.filter((x) => handakuProseRe.test(String(x.e.phonetic_change_detail ?? "")));
const byNote = all.filter((x) => chars(x.e).some((c) => handakuProseRe.test(String(c.reading_note ?? ""))));
const fmtSet = (xs: Row[]) =>
  xs.length
    ? " — " + xs.map((x) => `${x.e.compound} (\`${x.e.id}\`, tokens ${JSON.stringify(changes(x.e))})`).join(", ")
    : "";
L(`- Entries with a \`phonetic_changes\` token matching /handaku|半濁/: **${byToken.length}**${fmtSet(byToken)}`);
L(`- Entries whose \`phonetic_change_detail\` mentions 半濁, パ行 or semi-voicing: **${byDetail.length}**${fmtSet(byDetail)}`);
L(`- Entries with a \`reading_note\` mentioning 半濁, パ行 or semi-voicing: **${byNote.length}**${fmtSet(byNote)}`);
L();
L("The four entries `CLAUDE.md` §5 and `DATA_SPEC.md` §6 name as the complete 半濁音化 set:");
L();
L("| Compound | Present in source? | Source ID | `phonetic_changes` | `phonetic_change_detail` |");
L("|---|---|---|---|---|");
for (const c of HANDAKU_SET) {
  const xs = all.filter((x) => x.e.compound === c);
  if (xs.length === 0) L(`| ${c} | **missing** | — | — | — |`);
  for (const x of xs)
    L(`| ${c} | yes (batch ${x.batch}) | \`${x.e.id}\` | ${JSON.stringify(changes(x.e))} | ${md(x.e.phonetic_change_detail)} |`);
}
L();
const handakuUnion = new Set([...byToken, ...byDetail, ...byNote].map((x) => String(x.e.compound)));
const exact = HANDAKU_SET.every((c) => handakuUnion.has(c)) && [...handakuUnion].every((c) => HANDAKU_SET.includes(c));
L(
  `Union of the three detections: ${[...handakuUnion].sort().join(", ") || "(none)"}. Is it exactly {散歩, 年俸, 心配, 乾杯}? **${
    exact ? "yes" : "no"
  }**.`,
);
L();
const otherToken = all.filter((x) => changes(x.e).includes("other"));
L(`Entries carrying the token \`other\` (${otherToken.length}), with their detail, since 半濁音化 may be filed there:`);
L();
L("| Batch | ID | Compound | `phonetic_change_detail` |");
L("|---|---|---|---|");
for (const x of otherToken) L(`| ${x.batch} | \`${x.e.id}\` | ${x.e.compound} | ${md(x.e.phonetic_change_detail)} |`);
L();

// ---- 4.1 Token mapping coverage against DATA_SPEC.md §6
L("### 4.1 Phonetic-change token spellings against `DATA_SPEC.md` §6");
L();
const specText = readFileSync(join(ROOT, "DATA_SPEC.md"), "utf8");
const seenTokens = [
  ...sortedKeys(pcAll).map((t) => ({ where: "source batches", token: t })),
  ...sortedKeys(protoChanges).map((t) => ({ where: "prototype", token: t })),
];
L("Every distinct token spelling found in the files, and whether `DATA_SPEC.md` names that exact spelling as a code cell or in backticks (so the consolidation script has a rule to key on; a substring inside a longer word, such as 半濁音 inside 半濁音化, does not count):");
L();
L("| Found in | Token | Named in DATA_SPEC.md |");
L("|---|---|---|");
const specNames = (token: string) => specText.includes(`\`${token}\``) || specText.includes(`| ${token} |`);
for (const t of seenTokens) L(`| ${t.where} | \`${t.token}\` | ${specNames(t.token) ? "yes" : "**no**"} |`);
L();

// ---- 5. Contested
L("## 5. The eight contested compounds (`DATA_SPEC.md` §7.4)");
L();
const CONTESTED = [
  ["貼付", "ちょうふ", "てんぷ"],
  ["施行", "しこう", "せこう"],
  ["代替", "だいたい", "だいがえ"],
  ["重複", "ちょうふく", "じゅうふく"],
  ["依存", "いそん", "いぞん"],
  ["続柄", "つづきがら", "ぞくがら"],
  ["遊説", "ゆうぜい", "ゆうせつ"],
  ["一段落", "いちだんらく", "ひとだんらく"],
];
L("| Compound | Present? | Source ID | Batch | Source `reading` | Alternate readings in source | Prescriptive / variant per spec |");
L("|---|---|---|---|---|---|---|");
let contestedPresent = 0;
for (const [c, pres, variant] of CONTESTED) {
  const xs = all.filter((x) => x.e.compound === c);
  if (xs.length === 0) {
    L(`| ${c} | **missing** | — | — | — | — | ${pres} / ${variant} |`);
    continue;
  }
  contestedPresent++;
  for (const x of xs) {
    const alts = (x.e.alternate_readings as { reading?: string; status?: string }[] | undefined) ?? [];
    L(
      `| ${c} | yes | \`${x.e.id}\` | ${x.batch} | ${x.e.reading} | ${
        alts.length ? alts.map((a) => `${a.reading} (${a.status ?? "no status"})`).join("; ") : "none recorded"
      } | ${pres} / ${variant} |`,
    );
  }
}
L();
L(`Present: ${contestedPresent} of 8.`);
L();

// ---- 6. Claims vs computed
L("## 6. Claims in the planning documents beside the computed value");
L();
L('Claims are quoted with their confidence tag where the document gives one. "Computed" is what this script found in the files.');
L();

const b = (n: number) => batches.find((x) => x.batch === n)!;
const clsIn = (bs: number[], cls: string) => all.filter((x) => bs.includes(x.batch) && x.e.classification === cls).length;
const perBatch = (cls: string) => [1, 2, 3, 4].map((n) => clsIn([n], cls));
const b123 = [1, 2, 3];
const split123 = CLS_ORDER.map((k) => clsIn(b123, k));
const other123 = all.filter((x) => b123.includes(x.batch) && !CLS_ORDER.includes(String(x.e.classification)));
const b1split = CLS_ORDER.map((k) => clsIn([1], k));
const juubakoNumsB3 = b(3)
  .entries.filter((e) => idPrefix(String(e.id)) === "juubako")
  .map((e) => Number(String(e.id).split("_").pop()));
const maxJuubakoB3 = juubakoNumsB3.length ? Math.max(...juubakoNumsB3) : NaN;
const firstB4 = String(b(4).entries[0]?.id);
const rt = (k: string) => rtAll.get(k) ?? 0;
const pc = (k: string) => pcAll.get(k) ?? 0;
const charLenN = (k: string) => charLen.get(k) ?? 0;
const freqOf = (ch: string) => charFreq.get(ch)?.length ?? 0;
const spanOf = (ch: string) => new Set((charFreq.get(ch) ?? []).map((x) => String(x.e.classification))).size;
const find = (compound: string) => all.find((y) => y.e.compound === compound);
const findId = (id: string) => all.find((y) => y.e.id === id);
const CHAIN_CLAIM =
  "場9:4,手9:3,物9:4,雨6:4,本6:2,朝5:4,一5:3,毎5:2,間4:3,生4:3,夕4:2,新3:3,茶3:2,焼3:2,金3:3,替3:3,額3:2,番3:2";

type Claim = { doc: string; claim: string; computed: string; ok: boolean | null };
const claims: Claim[] = [];
const claim = (doc: string, text: string, computed: string, ok: boolean | null) => claims.push({ doc, claim: text, computed, ok });

claim("BUILD_PLAN.md — Status of inputs", "Batch 1: 30 entries [V]", String(b(1).entries.length), b(1).entries.length === 30);
claim("BUILD_PLAN.md — Status of inputs", "Batch 2: 50 entries [T]", String(b(2).entries.length), b(2).entries.length === 50);
claim("BUILD_PLAN.md — Status of inputs", "Batch 3: 46 entries [T]", String(b(3).entries.length), b(3).entries.length === 46);
claim("BUILD_PLAN.md — Status of inputs", 'Batch 4: 49 entries ("entries 127–175") [T]', String(b(4).entries.length), b(4).entries.length === 49);
claim("BUILD_PLAN.md — Status of inputs (as received)", "Prototype: ~45 embedded compact entries [U]", String(proto.entries.length), proto.entries.length === 45);
claim("BUILD_PLAN.md — 0.1", "Total across four batches ≈ 175 [T]", String(total), total === 175);
claim(
  "BUILD_PLAN.md — 0.1",
  "Batches 1–3 split: 音音 35, 訓訓 27, 重箱 20, 湯桶 21, 熟字訓 21, irregular/3-char 2 = 126 [T]",
  `音音 ${split123[0]}, 訓訓 ${split123[1]}, 重箱 ${split123[2]}, 湯桶 ${split123[3]}, 熟字訓 ${split123[4]}, other ${other123.length} = ${
    b(1).entries.length + b(2).entries.length + b(3).entries.length
  }`,
  split123.join() === "35,27,20,21,21" && other123.length === 2,
);
claim(
  "BUILD_PLAN.md — 0.1",
  "Batch 1 split: 音音 7, 訓訓 7, 重箱 8, 湯桶 6, 熟字訓 2 = 30 [V]",
  `音音 ${b1split[0]}, 訓訓 ${b1split[1]}, 重箱 ${b1split[2]}, 湯桶 ${b1split[3]}, 熟字訓 ${b1split[4]} = ${b(1).entries.length}`,
  b1split.join() === "7,7,8,6,2",
);
claim(
  "BUILD_PLAN.md — 0.1",
  "alternate_readings[] present on some but not all verbose entries [T]",
  `${withAlt.length} of ${total}`,
  withAlt.length > 0 && withAlt.length < total,
);
claim(
  "BUILD_PLAN.md — 0.1 / CLAUDE.md §6.2",
  "Batch 3 reached juubako_86; batch 4 opens at juubako_25 [T]",
  `batch 3 highest juubako_ number: ${maxJuubakoB3}; batch 4 first ID: ${firstB4}`,
  maxJuubakoB3 === 86 && firstB4 === "juubako_25",
);
claim("BUILD_PLAN.md — 0.1 / CLAUDE.md §6.2", "Cross-batch ID collisions likely [T]", `${dupIds.length} duplicate IDs`, dupIds.length > 0);
claim(
  "BUILD_PLAN.md — Phase 3",
  "重箱 underrepresented: 20 vs 35 音音 across batches 1–3 [T]",
  `重箱 ${split123[2]} vs 音音 ${split123[0]} (batches 1–3); ${clsAll.get("juubako")} vs ${clsAll.get("on_on")} over all four`,
  split123[2] === 20 && split123[0] === 35,
);
claim(
  "BUILD_PLAN.md — Honest assessment",
  "About one third of entries need knowledge beyond classification [T]",
  "not computable from the files (a judgement, not a field)",
  null,
);
claim("CLAUDE.md §5", "連濁 is the largest cluster, roughly 30 entries", `rendaku token on ${pc("rendaku")} entries`, pc("rendaku") >= 28 && pc("rendaku") <= 32);
claim(
  "DATA_SPEC.md §6 (CLAUDE.md §5 names five examples without a count)",
  "促音 has around six entries (学校, 早速, 約款, 切手, 物質 and others)",
  `sokuon token on ${pc("sokuon")} entries: ${all
    .filter((x) => changes(x.e).includes("sokuon"))
    .map((x) => x.e.compound)
    .join(" ")}`,
  pc("sokuon") >= 5 && pc("sokuon") <= 7,
);
claim(
  "CLAUDE.md §5 / DATA_SPEC.md §6",
  "半濁音化 is a complete four-entry set: 散歩, 年俸, 心配, 乾杯",
  `detected set: ${[...handakuUnion].sort().join(", ") || "(none)"}; exact match: ${exact ? "yes" : "no"}`,
  exact,
);
claim(
  "CLAUDE.md §6.1",
  "ID-prefix mismatches include 値段 juubako_56, 勝負 juubako_57, 夕暮れ yutou_24, 台風 juubako_25",
  ["値段", "勝負", "夕暮れ", "台風"]
    .map((c) => {
      const x = find(c);
      return x ? `${c} \`${x.e.id}\` ${x.e.classification}` : `${c} missing`;
    })
    .join("; "),
  ["値段|juubako_56|yutou", "勝負|juubako_57|on_on", "夕暮れ|yutou_24|kun_kun", "台風|juubako_25|on_on"].every((s) => {
    const [c, id, cls] = s.split("|");
    return all.some((x) => x.e.compound === c && x.e.id === id && x.e.classification === cls);
  }),
);
{
  const x = find("勝負");
  claim(
    "CLAUDE.md §6.6",
    "勝負 has a reading note about フ → ぶ but an empty phonetic_changes array",
    x
      ? `phonetic_changes ${JSON.stringify(changes(x.e))}; a reading_note mentions ぶ or voicing: ${chars(x.e).some((c) =>
          /ぶ|voic/i.test(String(c.reading_note ?? "")),
        )}`
      : "勝負 missing",
    !!x && changes(x.e).length === 0,
  );
}
{
  const s = findId("yutou_05");
  const p = proto.entries.find((y) => y.id === "yt01");
  claim(
    "CLAUDE.md §6.7 / DATA_SPEC.md §4.2",
    "Verbose yutou_05 場所 = yutou with 場 kun; prototype yt01 = on_on with 場 on",
    `source: ${s ? `${s.e.compound} ${s.e.classification}, 場 ${chars(s.e)[0]?.reading_type}` : "yutou_05 missing"}; prototype: ${
      p ? `${p.compound} ${p.cls}, 場 ${p.chars[0].t}` : "yt01 missing"
    }`,
    !!s &&
      s.e.compound === "場所" &&
      s.e.classification === "yutou" &&
      chars(s.e)[0]?.reading_type === "kun" &&
      !!p &&
      p.cls === "on_on" &&
      p.chars[0].t === "on",
  );
}
{
  const xs = b(1).entries.filter((e) => e.classification === "jukujikun");
  claim(
    "CLAUDE.md §6.8",
    'Batch 1\'s 熟字訓 entries mark both characters reading_type "neither"',
    `${xs.length} 熟字訓 in batch 1; reading_type values: ${[...new Set(xs.flatMap((e) => chars(e).map((c) => String(c.reading_type))))].join(", ")}`,
    xs.every((e) => chars(e).every((c) => c.reading_type === "neither")),
  );
}
claim(
  "reports/00-recovery.md",
  "Files: 30 / 50 / 46 / 42 = 168",
  `${batches.map((x) => x.entries.length).join(" / ")} = ${total}`,
  batches.map((x) => x.entries.length).join() === "30,50,46,42" && total === 168,
);
claim("reports/00-recovery.md", "音音 per batch 7 / 13 / 18 / 15 = 53", `${perBatch("on_on").join(" / ")} = ${clsAll.get("on_on") ?? 0}`, perBatch("on_on").join() === "7,13,18,15");
claim("reports/00-recovery.md", "訓訓 per batch 7 / 9 / 16 / 14 = 46", `${perBatch("kun_kun").join(" / ")} = ${clsAll.get("kun_kun") ?? 0}`, perBatch("kun_kun").join() === "7,9,16,14");
claim("reports/00-recovery.md", "重箱 per batch 8 / 9 / 2 / 6 = 25", `${perBatch("juubako").join(" / ")} = ${clsAll.get("juubako") ?? 0}`, perBatch("juubako").join() === "8,9,2,6");
claim("reports/00-recovery.md", "湯桶 per batch 6 / 7 / 5 / 2 = 20", `${perBatch("yutou").join(" / ")} = ${clsAll.get("yutou") ?? 0}`, perBatch("yutou").join() === "6,7,5,2");
claim("reports/00-recovery.md", "熟字訓 per batch 2 / 12 / 4 / 2 = 20", `${perBatch("jukujikun").join(" / ")} = ${clsAll.get("jukujikun") ?? 0}`, perBatch("jukujikun").join() === "2,12,4,2");
claim(
  "reports/00-recovery.md",
  "irregular per batch 0 / 0 / 1 / 2 = 3; n/a 0 / 0 / 0 / 1 = 1",
  `irregular ${perBatch("irregular").join(" / ")} = ${clsAll.get("irregular") ?? 0}; n/a ${perBatch("n/a").join(" / ")} = ${clsAll.get("n/a") ?? 0}`,
  perBatch("irregular").join() === "0,0,1,2" && perBatch("n/a").join() === "0,0,0,1",
);
claim(
  "reports/00-recovery.md",
  "Index's batch 3 table (音音 15 / 訓訓 12 / 重箱 3 / 湯桶 7 / 熟字訓 7 / irregular 2) is wrong; the file has 18 / 16 / 2 / 5 / 4 / 1",
  `batch 3: ${CLS_ORDER.map((k) => clsIn([3], k)).join(" / ")} / ${clsIn([3], "irregular")}`,
  [...CLS_ORDER.map((k) => clsIn([3], k)), clsIn([3], "irregular")].join() === "18,16,2,5,4,1",
);
claim("reports/00-recovery.md", "Duplicate IDs across batches: 0", String(dupIds.length), dupIds.length === 0);
claim("reports/00-recovery.md", "ID prefix contradicts classification: 45 of 168", `${prefixMismatch.length} of ${total}`, prefixMismatch.length === 45);
claim(
  "reports/00-recovery.md",
  "Classification derivation violations (2-char): 2 of 163",
  `${derivViolations.length} stale-field violations among ${twoCharDecomposable.length} decomposable two-character entries (${twoChar.length} two-character entries in all, ${twoChar.length - twoCharDecomposable.length} 熟字訓 excluded); a further ${derivOutsideEnum.length} entries are classified \`irregular\` and cannot be derived at all: ${derivOutsideEnum
    .map((x) => `${x.e.compound} (${chars(x.e).map((c) => c.reading_type).join("+")} → ${display(derive(chars(x.e)[0].reading_type, chars(x.e)[1].reading_type) ?? "?")})`)
    .join(", ")}`,
  derivViolations.length === 2,
);
claim(
  "reports/00-recovery.md",
  "The two violations are 革靴 juubako_34 and 初耳 juubako_45",
  derivViolations.map((x) => `${x.e.compound} \`${x.e.id}\``).join(", ") || "(none)",
  derivViolations.length === 2 && derivViolations.every((x) => ["juubako_34", "juubako_45"].includes(String(x.e.id))),
);
claim("reports/00-recovery.md", "Distinct classification values: 7 (five framework + irregular + n/a)", `${clsAll.size}: ${sortedKeys(clsAll, CLS_ORDER).join(", ")}`, clsAll.size === 7);
claim(
  "reports/00-recovery.md",
  "reading_type: on 156, kun 144, neither 39",
  sortedKeys(rtAll)
    .map((k) => `${k} ${rt(k)}`)
    .join(", "),
  rt("on") === 156 && rt("kun") === 144 && rt("neither") === 39 && rtAll.size === 3,
);
claim(
  "reports/00-recovery.md",
  "phonetic_changes tokens: rendaku 24, sokuon 9, other 4",
  sortedKeys(pcAll)
    .map((k) => `${k} ${pc(k)}`)
    .join(", "),
  pc("rendaku") === 24 && pc("sokuon") === 9 && pc("other") === 4 && pcAll.size === 3,
);
claim("reports/00-recovery.md", "Entries with alternate_readings: 21", String(withAlt.length), withAlt.length === 21);
claim(
  "reports/00-recovery.md",
  "Character counts: 163 two-char, 4 three-char, 1 single-char",
  `${charLenN("2")} two, ${charLenN("3")} three, ${charLenN("1")} one (by characters[] length)`,
  charLenN("2") === 163 && charLenN("3") === 4 && charLenN("1") === 1,
);
claim(
  "reports/00-recovery.md",
  "Chain table: 場 9 (4 spanned), 手 9 (3), 物 9 (4), 雨 6 (4), 本 6 (2), 朝 5 (4), 一 5 (3), 毎 5 (2), 間 4 (3), 生 4 (3), 夕 4 (2), 新 3 (3), 茶 3 (2), 焼 3 (2), 金 3 (3), 替 3 (3), 額 3 (2), 番 3 (2)",
  CHAIN_CLAIM.split(",")
    .map((s) => `${s[0]} ${freqOf(s[0])} (${spanOf(s[0])})`)
    .join(", "),
  CHAIN_CLAIM.split(",").every((s) => {
    const ch = s[0];
    const [n, sp] = s.slice(1).split(":").map(Number);
    return freqOf(ch) === n && spanOf(ch) === sp;
  }),
);
claim(
  "reports/00-recovery.md",
  "Characters in three or more entries: exactly the 18 listed",
  `${chainCandidates.length}: ${chainCandidates.map(([ch, xs]) => `${ch}${xs.length}`).join(" ")}`,
  chainCandidates.length === 18,
);

L("| Document | Claim | Computed | Verdict |");
L("|---|---|---|---|");
for (const c of claims) L(`| ${c.doc} | ${md(c.claim)} | ${md(c.computed)} | ${c.ok === null ? "NOT COMPUTABLE" : verdict(c.ok)} |`);
L();
L(
  `Confirmed: ${claims.filter((c) => c.ok === true).length}. Refuted: ${claims.filter((c) => c.ok === false).length}. Not computable: ${
    claims.filter((c) => c.ok === null).length
  }.`,
);
L();

const reasoningRe = /\bwait\b|\bactually\b|\bhmm\b|\bcorrection\b|\bre-?think/i;
const proseFields = (x: Row): [string, unknown][] => [
  ["trap_note", x.e.trap_note],
  ["difficulty_rationale", x.e.difficulty_rationale],
  ["real_world_context", x.e.real_world_context],
  ["phonetic_change_detail", x.e.phonetic_change_detail],
  ...chars(x.e).map((c, i): [string, unknown] => [`characters[${i}].reading_note`, c.reading_note]),
];
const reasoning = all.filter((x) => proseFields(x).some(([, f]) => reasoningRe.test(String(f ?? ""))));
L("### 6.1 Entries whose prose fields contain self-correction markers");
L();
L(
  '`reports/00-recovery.md` names 雨量, 場面, 真っ赤, 革靴, 灰色, 初耳, 音読み (seven names under the heading "six"). Scan of `trap_note`, `difficulty_rationale`, `real_world_context`, `phonetic_change_detail` and every `reading_note` for the words wait / actually / hmm / correction / rethink:',
);
L();
L("| Batch | ID | Compound | Field | Excerpt |");
L("|---|---|---|---|---|");
for (const x of reasoning) {
  for (const [name, val] of proseFields(x)) {
    const s = String(val ?? "");
    const m = reasoningRe.exec(s);
    if (!m) continue;
    const start = Math.max(0, m.index - 40);
    L(`| ${x.batch} | \`${x.e.id}\` | ${x.e.compound} | \`${name}\` | …${md(s.slice(start, m.index + 60))}… |`);
  }
}
L();
L(
  `Entries matched: ${reasoning.length} — ${reasoning.map((x) => x.e.compound).join(", ") || "none"}. The recovery report's seven: ${[
    "雨量",
    "場面",
    "真っ赤",
    "革靴",
    "灰色",
    "初耳",
    "音読み",
  ]
    .map((c) => `${c} ${reasoning.some((x) => x.e.compound === c) ? "matched" : "not matched by this scan"}`)
    .join("; ")}.`,
);
L();

// ---- 7. Corrections made
L("## 7. Corrections made to the planning documents");
L();
L("Where a document line contradicted the computed value, the line was corrected in Session 1. `DATA_SPEC.md` received only the token-mapping addition the brief allowed. Each correction:");
L();
if (CORRECTIONS.length === 0) L("- (none recorded)");
for (const c of CORRECTIONS) L(`- ${c}`);
L();
L("### 7.1 Contradictions found but not corrected");
L();
for (const c of NOT_CORRECTED) L(`- ${c}`);
L();

writeFileSync(OUT, lines.join("\n") + "\n");
console.log(
  `wrote ${OUT} (${lines.length} lines); total entries ${total}; prototype ${proto.entries.length}; disagreements ${disagreements.length}; claims confirmed ${
    claims.filter((c) => c.ok === true).length
  } refuted ${claims.filter((c) => c.ok === false).length}`,
);
