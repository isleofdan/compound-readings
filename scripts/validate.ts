// Validation of the canonical dataset (BUILD_PLAN.md 0.6; DATA_SPEC.md §7).
// Run: npm run validate. Exit code is non-zero on any ERROR. WARNs are printed,
// and every WARN is written to reports/02-flagged.md together with the other
// flags this session raises for Dan. The §7.7 coverage block prints on every
// run. Output carries no timestamp; re-running on unchanged inputs reproduces
// the report byte for byte.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ChainsFileSchema,
  DatasetSchema,
  deriveClassification,
  type Chain,
  type ChainsFile,
  type Classification,
  type Dataset,
  type Entry,
} from "../src/data/schema";
import { CLASSIFICATION_LABELS, CLASSIFICATION_ORDER, PHONETIC_CHANGE_LABELS, PHONETIC_CHANGE_ORDER } from "../src/data/labels";
import { loadPrototype } from "./consolidate";

const ROOT = process.cwd();
const DATA = join(ROOT, "data", "compounds.json");
const CHAINS = join(ROOT, "data", "chains.json");
const ANCHORS = join(ROOT, "scripts", "anchors.json");
const OUT_FLAGGED = join(ROOT, "reports", "02-flagged.md");

// ---------------------------------------------------------------- types

export type Level = "ERROR" | "WARN";
export type Issue = { level: Level; rule: string; entry: string; detail: string };

export type Anchor = {
  compound: string;
  reading: string;
  classification: Classification;
  reading_types?: string[];
  phonetic_changes?: string[];
  asserted_in: string;
  note: string;
};

export type Result = { errors: Issue[]; warns: Issue[]; coverage: string[] };

// ---------------------------------------------------------------- helpers

const isKanji = (ch: string) => /\p{Script=Han}/u.test(ch);
const isKana = (ch: string) => /[ぁ-ゖァ-ヺー]/u.test(ch);
const kanjiOf = (s: string) => [...s].filter(isKanji);
const stripKana = (s: string) => [...s].filter((ch) => !isKana(ch)).join("");

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// u-row → i-row for the 連用形 stem of a 五段 verb.
const U_TO_I: Record<string, string> = {
  う: "い", く: "き", ぐ: "ぎ", す: "し", ず: "じ", つ: "ち", づ: "ぢ", ぬ: "に", ふ: "ひ", ぶ: "び", ぷ: "ぴ", む: "み", ゆ: "い", る: "り",
};
const I_E_ROW = "いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ";

/** DATA_SPEC.md §7.5 stem rule — the 連用形 stems of a dictionary-form kun reading. */
export function kunStems(k: string): string[] {
  const chars = [...k];
  if (chars.length < 2) return [];
  const last = chars[chars.length - 1];
  const prev = chars[chars.length - 2];
  const base = chars.slice(0, -1).join("");
  const stems: string[] = [];
  // 一段 verb: drop る when the kana before it is in the i- or e-row (つける → つけ).
  if (last === "る" && I_E_ROW.includes(prev)) stems.push(base);
  // 五段 verb: shift the final u-row kana to the i-row (けす → けし, つづく → つづき, よむ → よみ).
  if (U_TO_I[last]) stems.push(base + U_TO_I[last]);
  return stems;
}

/** True if `ric` equals a kun reading or one of its 連用形 stems (after kana normalization). */
export function matchesKun(ric: string, kunReadings: string[]): boolean {
  const r = toHiragana(ric);
  return kunReadings.some((k) => {
    const h = toHiragana(k);
    return h === r || kunStems(h).includes(r);
  });
}

export function matchesOn(ric: string, onReadings: string[]): boolean {
  const r = toHiragana(ric);
  return onReadings.some((k) => toHiragana(k) === r);
}

/** Exact dictionary match only — no stems. Used by the §7.5 converse check. */
function matchesExactly(ric: string, on: string[], kun: string[]): boolean {
  const r = toHiragana(ric);
  return [...on, ...kun].some((k) => toHiragana(k) === r);
}

function label(e: Entry): string {
  return `${e.id} ${e.compound}`;
}

// Machine-checkable statements of the clean chain rules in CLAUDE.md §5, used by
// §7.6 to catch a clean rule with an exception. Keyed by chain character.
const CLEAN_RULES: Record<string, { reading: string; type: "on" | "kun" }> = {
  手: { reading: "て", type: "kun" },
  夕: { reading: "ゆう", type: "kun" },
  毎: { reading: "まい", type: "on" },
};

// DATA_SPEC.md §7.4 — the eight contested compounds.
export const CONTESTED_EIGHT = ["貼付", "施行", "代替", "重複", "依存", "続柄", "遊説", "一段落"];

// ---------------------------------------------------------------- validate

export function validateDataset(datasetRaw: unknown, chainsRaw: unknown, anchors: Anchor[]): Result {
  const errors: Issue[] = [];
  const warns: Issue[] = [];
  const E = (rule: string, entry: string, detail: string) => errors.push({ level: "ERROR", rule, entry, detail });
  const W = (rule: string, entry: string, detail: string) => warns.push({ level: "WARN", rule, entry, detail });

  // §7.1 — schema
  const parsed = DatasetSchema.safeParse(datasetRaw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const idx = typeof issue.path[1] === "number" ? issue.path[1] : null;
      const raw = datasetRaw as { entries?: { id?: string; compound?: string }[] };
      const e = idx !== null ? raw.entries?.[idx] : undefined;
      E("§7.1 schema", e ? `${e.id ?? "?"} ${e.compound ?? "?"}` : "(dataset)", `${issue.path.join(".")}: ${issue.message}`);
    }
  }
  const dataset: Dataset = parsed.success ? parsed.data : { $schema_version: "1.0.0", entries: [] };
  const entries = dataset.entries;

  const chainsParsed = ChainsFileSchema.safeParse(chainsRaw);
  if (!chainsParsed.success) for (const issue of chainsParsed.error.issues) E("§7.6 chains.json schema", "(chains.json)", `${issue.path.join(".")}: ${issue.message}`);
  const chainsFile: ChainsFile = chainsParsed.success ? chainsParsed.data : { $status: "proposed", chains: [] };

  // §7.1 — uniqueness and structure
  const seenId = new Map<string, Entry>();
  const seenSource = new Map<string, Entry>();
  for (const e of entries) {
    if (seenId.has(e.id)) E("§7.1 id unique", label(e), `duplicate id, also on ${seenId.get(e.id)!.compound}`);
    seenId.set(e.id, e);
    const sk = `${e.source_batch}:${e.source_id}`;
    if (seenSource.has(sk)) E("§7.1 source_id+source_batch unique", label(e), `duplicate ${sk}, also on ${seenSource.get(sk)!.compound}`);
    seenSource.set(sk, e);

    if (e.characters.length !== e.char_count) E("§7.1 characters.length === char_count", label(e), `${e.characters.length} characters, char_count ${e.char_count}`);
    const kanji = kanjiOf(e.compound);
    if (kanji.length !== e.char_count) E("§7.1 char_count equals kanji count", label(e), `${kanji.length} kanji in compound, char_count ${e.char_count}`);
    const concat = e.characters.map((c) => c.kanji).join("");
    if (concat !== stripKana(e.compound)) E("§7.1 kanji concatenation equals compound (kana removed)", label(e), `${concat} vs ${stripKana(e.compound)}`);
    const hasKana = [...e.compound].some(isKana);
    if (hasKana !== e.has_kana) E("§7.1 has_kana", label(e), `compound ${hasKana ? "contains" : "has no"} kana but has_kana is ${e.has_kana}`);
    if (e.decomposable !== (e.classification !== "jukujikun")) E("§4.1 decomposable", label(e), `decomposable ${e.decomposable} with classification ${e.classification}`);
  }

  // §7.2 — derivation
  for (const e of entries) {
    const isJuku = e.classification === "jukujikun";
    if (isJuku) {
      const typed = e.characters.filter((c) => c.reading_type !== "neither");
      if (typed.length) W("§7.2 熟字訓 with per-character reading types", label(e), `reading_type ${e.characters.map((c) => c.reading_type).join(", ")} — usually means misclassified`);
      continue;
    }
    const neither = e.characters.filter((c) => c.reading_type === "neither");
    if (neither.length) E("§7.2 `neither` on a non-熟字訓 entry", label(e), `characters ${neither.map((c) => c.kanji).join(", ")}`);
    if (e.char_count === 2) {
      const d = deriveClassification(e.characters[0].reading_type, e.characters[1].reading_type);
      if (d !== e.classification)
        E("§7.2 classification derivation", label(e), `${e.characters[0].reading_type} + ${e.characters[1].reading_type} derives ${d ?? "nothing"}, recorded ${e.classification}`);
    } else if (e.char_count > 2) {
      W("§7.2 char_count > 2 (manual review)", label(e), `${e.char_count} kanji, asserted ${CLASSIFICATION_LABELS[e.classification]}; reading types ${e.characters.map((c) => c.reading_type).join(", ")}`);
    }
  }

  // §7.3 — alternates (enum is enforced by the schema)
  for (const e of entries)
    for (const a of e.alternate_readings)
      if (a.classification !== e.classification && !(e.trap_note ?? "").includes(a.reading))
        W("§7.3 classification-changing alternate not mentioned in trap_note", label(e), `${a.reading} is ${CLASSIFICATION_LABELS[a.classification]} while the entry is ${CLASSIFICATION_LABELS[e.classification]}; trap_note does not mention ${a.reading}`);

  // §7.4 — contested
  for (const e of entries) if (e.contested && !e.contested_note) E("§7.4 contested requires contested_note", label(e), "contested is true, contested_note is null");
  for (const c of CONTESTED_EIGHT) {
    const e = entries.find((x) => x.compound === c);
    if (!e) E("§7.4 the eight contested compounds present", c, "missing from the dataset — data was lost");
    else if (!e.contested) E("§7.4 the eight contested compounds contested", label(e), "contested is false");
  }

  // §7.5 — phonetic-change consistency
  for (const e of entries) {
    if (e.classification === "jukujikun") continue;
    const unexplained: string[] = [];
    let allExact = true;
    for (const c of e.characters) {
      if (c.reading_type === "neither" || c.reading_in_compound == null) continue;
      const ok = matchesOn(c.reading_in_compound, c.on_readings) || matchesKun(c.reading_in_compound, c.kun_readings);
      if (!ok) unexplained.push(`${c.kanji} ${c.reading_in_compound} (on ${c.on_readings.join("・") || "—"}; kun ${c.kun_readings.join("・") || "—"})`);
      if (!matchesExactly(c.reading_in_compound, c.on_readings, c.kun_readings)) allExact = false;
    }
    if (e.phonetic_changes.length === 0 && unexplained.length)
      W("§7.5 reading matches no dictionary reading while phonetic_changes is empty", label(e), unexplained.join("; "));
    if (e.phonetic_changes.length > 0 && allExact)
      W("§7.5 phonetic change listed but every reading matches a dictionary reading exactly", label(e), `${e.phonetic_changes.join(", ")}: ${e.phonetic_change_detail ?? "(no detail)"}`);
  }

  // §7.6 — chains
  const byId = new Map(entries.map((e) => [e.id, e]));
  const whitelist = new Map<string, Chain>(chainsFile.chains.map((c) => [c.character, c]));
  for (const e of entries) {
    for (const ch of e.chains) {
      if (!e.compound.includes(ch)) W("§7.6 chain character not in compound", label(e), ch);
      if (!whitelist.has(ch)) W("§7.6 chain character not in chains.json", label(e), ch);
    }
    for (const ch of whitelist.keys()) if (kanjiOf(e.compound).includes(ch) && !e.chains.includes(ch)) W("§7.6 entry missing a whitelisted chain", label(e), ch);
  }
  for (const chain of chainsFile.chains) {
    for (const id of chain.entry_order) if (!byId.has(id)) W("§7.6 entry_order id does not resolve", `chain ${chain.character}`, id);
    const members = entries.filter((e) => e.chains.includes(chain.character));
    for (const m of members) if (!chain.entry_order.includes(m.id)) W("§7.6 chain member missing from entry_order", `chain ${chain.character}`, label(m));
    if (chain.rule_reliability === "clean") {
      const rule = CLEAN_RULES[chain.character];
      if (!rule) {
        W("§7.6 clean rule not machine-checkable", `chain ${chain.character}`, "no entry in the validator's CLEAN_RULES table");
        continue;
      }
      for (const m of members) {
        const c = m.characters.find((x) => x.kanji === chain.character);
        if (!c) continue;
        if (c.reading_type !== rule.type || toHiragana(c.reading_in_compound ?? "") !== rule.reading)
          W("§7.6 clean chain rule contradicted — content bug", `chain ${chain.character}`, `${label(m)}: ${chain.character} = ${c.reading_in_compound} ${c.reading_type}, rule says ${rule.reading} ${rule.type}`);
      }
    }
  }

  // §7.8 — anchors
  const byKey = new Map(entries.map((e) => [`${e.compound}|${e.reading}`, e]));
  for (const a of anchors) {
    const e = byKey.get(`${a.compound}|${a.reading}`);
    if (!e) {
      E("§7.8 anchor", `${a.compound} ${a.reading}`, `no entry with this compound and reading (asserted in ${a.asserted_in})`);
      continue;
    }
    if (e.classification !== a.classification) E("§7.8 anchor", label(e), `classification ${e.classification}, ${a.asserted_in} asserts ${a.classification}`);
    if (a.reading_types) {
      const got = e.characters.map((c) => c.reading_type);
      if (got.join(",") !== a.reading_types.join(",")) E("§7.8 anchor", label(e), `reading types ${got.join(",")}, ${a.asserted_in} asserts ${a.reading_types.join(",")}`);
    }
    if (a.phonetic_changes)
      for (const pc of a.phonetic_changes) if (!e.phonetic_changes.includes(pc as Entry["phonetic_changes"][number])) E("§7.8 anchor", label(e), `phonetic_changes ${JSON.stringify(e.phonetic_changes)} lacks ${pc} (${a.asserted_in})`);
  }

  // §7.7 — coverage
  const coverage: string[] = [];
  const total = entries.length;
  const byCls = (k: Classification) => entries.filter((e) => e.classification === k).length;
  coverage.push(`Entries: ${total}`);
  coverage.push("By classification: " + CLASSIFICATION_ORDER.map((k) => `${CLASSIFICATION_LABELS[k]} ${byCls(k)}`).join(", "));
  const ju = byCls("juubako");
  const oo = byCls("on_on");
  coverage.push(
    `Imbalance: 重箱 is ${ju} of ${total} entries; 音音 has ${(oo / Math.max(ju, 1)).toFixed(2)}× as many (${oo}). This reflects how the dataset was built, not Japanese frequency.`,
  );
  coverage.push("By difficulty: " + [1, 2, 3, 4].map((d) => `${d}: ${entries.filter((e) => e.difficulty === d).length}`).join(", "));
  coverage.push(
    "By phonetic change: " + PHONETIC_CHANGE_ORDER.map((p) => `${PHONETIC_CHANGE_LABELS[p]} ${entries.filter((e) => e.phonetic_changes.includes(p)).length}`).join(", ") + `; none ${entries.filter((e) => e.phonetic_changes.length === 0).length}`,
  );
  coverage.push(
    "Chain sizes: " + [...chainsFile.chains].sort((a, b) => a.display_order - b.display_order).map((c) => `${c.character} ${entries.filter((e) => e.chains.includes(c.character)).length}`).join(", "),
  );
  coverage.push(
    `With alternates: ${entries.filter((e) => e.alternate_readings.length).length}; with trap notes: ${entries.filter((e) => e.trap_note).length}; contested: ${entries.filter((e) => e.contested).length}; tagged unclassifiable: ${entries.filter((e) => e.tags.includes("unclassifiable")).length}`,
  );
  coverage.push(`Entries in zero chains: ${entries.filter((e) => e.chains.length === 0).length}`);

  return { errors, warns, coverage };
}

// ---------------------------------------------------------------- flagged report

const SELF_CORRECTION = /\b(wait|actually|hmm|correction|rethink)\b/i;

// Judgment flags that are not derivable from the data files (static by design,
// like the corrections list in scripts/audit.ts). Each is a decision for Dan's
// study project; none was applied to the data beyond what DATA_SPEC.md §3 and
// the session briefs prescribe. A flag a later brief decided keeps its text and
// gains a dated `decided` line, so the report shows what was asked and what
// was ruled.
const STATIC_FLAGS: { topic: string; flag: string; recommendation: string; decided?: string }[] = [
  {
    topic: "一段落 alternate ひとだんらく",
    flag: "The source gives this alternate the classification `irregular` (kun + on + on). The canonical enum has no such value; consolidation set it to 湯桶 (yutou) by the same rule DATA_SPEC.md §3 applies to 朝寝坊 (two-character derivation on the first two characters).",
    recommendation: "Keep 湯桶, or rule that three-character alternates carry the primary entry's classification.",
    decided: "2026-09-06 (Session 3 brief): 湯桶 by the three-character rule, accepted.",
  },
  {
    topic: "施行 alternate せこう",
    flag: "Its source status `variant — widespread but prescriptively contested` matched no row of the DATA_SPEC.md §7.3 rule table and fell to `disputed`. The other five contested alternates mapped to `variant_accepted` or `variant_spreading`.",
    recommendation: "Confirm `disputed`, or add the string to the `variant_spreading` row of the rule table.",
    decided: "2026-09-06 (Session 3 brief): \"prescriptively contested\" added to the `variant_spreading` row of DATA_SPEC.md §7.3; consolidation rerun; せこう now maps to `variant_spreading`.",
  },
  {
    topic: "場 chain rule_reliability",
    flag: "CLAUDE.md §5 gives 場 no reliability value; DATA_SPEC.md §5.2 names only 手/夕/毎 as clean and 目 as usually. chains.json proposes `usually` for 場 with the rule \"a character's reading type is not a fixed property\".",
    recommendation: "Accept `usually`.",
    decided: "2026-09-06 (Session 3 brief): `usually` accepted.",
  },
  {
    topic: "手 chain and 手段",
    flag: "CLAUDE.md §5 calls the 手 rule clean (手 is て throughout), but 手段 (しゅだん, 手 = シュ on) is in the dataset and in the chain. The validator flags it (§7.6). 切手 and 新手 also have 手 in second position.",
    recommendation: "Either restate the rule as \"when 手 is て, the partner decides\" (usually), or keep clean and exclude 手段 from the 手 chain's entry_order as the stated exception.",
    decided: "2026-09-06 (Session 3 brief): stays `clean`; 手段 is last in entry_order and listed in the chain's `exceptions`; the rule text is not reworded (pedagogy, owned by the study project). WARN 17 stays until the study project rules on the wording — reports/cargo-for-study-project-2026-09-06.md (a.3).",
  },
  {
    topic: "CLAUDE.md prose names entries that do not exist",
    flag: "CLAUDE.md §2 uses 目的 as a 音音 anchor and §5 describes the 目 chain with 目印, 目玉, 目安, 目標, 目的. None of these compounds is in any source batch; no entry contains 目. The 目 row in chains.json has an empty entry_order. DATA_SPEC.md §7.8 would require fixtures for these, which cannot pass, so they are not in scripts/anchors.json.",
    recommendation: "Add the five 目 entries in Phase 3 (dataset expansion), or drop 目 from CLAUDE.md §2/§5 until then. The next brief should authorize the CLAUDE.md edit either way.",
    decided: "2026-09-06 (Session 3 brief): the 目 row stays in chains.json and is not offered in Chain Explorer until it has entries; CLAUDE.md §2 and §5 each carry one sentence saying so. Adding entries is the study project's — cargo document (d).",
  },
  {
    topic: "Candidate tags not applied",
    flag: "DATA_SPEC.md §8 suggests tags only where the source supports them. The source prose supports: `kokuji` on 茶畑 (畑), 申込 (込), 辻褄 (辻), 枠組み (枠) — each reading_note or trap_note names the character as a 国字; `meta` on 音読み and 訓読み; `meal_matrix` on 朝食, 朝飯, 夕食, 夕飯; `color` on 真っ赤, 真っ白, 真っ黒, 真っ青, 茶色, 灰色; `number` on 一人, 二人, 一日, 一口, 一言, 二十歳. Only the tags the brief mandates (`unclassifiable`, and `kokuji` on 峠) were applied.",
    recommendation: "Approve the list and the next session applies it in consolidation with a migration-report row per tag.",
    decided: "2026-09-06 (Session 3 brief): not decided here; handed to the study project — cargo document (f). No tag applied.",
  },
  {
    topic: "DATA_SPEC.md §1 file table",
    flag: "The table lists `data/source/prototype-entries.json` as a read-only file. No such file exists; the prototype entries live inside `data/source/compound-drill.prototype.jsx` and are extracted at consolidation time. The row was outside this session's authorized amendments.",
    recommendation: "Authorize replacing that row with the .jsx path in the next brief.",
    decided: "2026-09-06 (Session 3 brief): the row now names the .jsx file and the extraction at consolidation time.",
  },
];

export function flaggedReport(dataset: Dataset, chainsFile: ChainsFile, result: Result): string {
  const L: string[] = [];
  const P = (s = "") => L.push(s);
  const entries = dataset.entries;
  const md = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

  P("# 02-flagged.md — Flags for Dan");
  P();
  P("Generated by `scripts/validate.ts` (`npm run validate`). Section 1 is every WARN the validator");
  P("raises on `data/compounds.json`; the count here equals the WARN count the validator prints.");
  P("Sections 2–4 are the other things Session 2 noticed and did **not** fix: the dataset content");
  P("and the pedagogy belong to Dan's study project, this repository owns the software. Nothing");
  P("in this file changed the data.");
  P();

  P(`## 1. Validator WARNs: ${result.warns.length}`);
  P();
  P("| # | Entry | Rule | Detail |");
  P("|---|---|---|---|");
  result.warns.forEach((w, i) => P(`| ${i + 1} | ${md(w.entry)} | ${md(w.rule)} | ${md(w.detail)} |`));
  P();
  P(`Validator ERRORs: ${result.errors.length}.`);
  P();

  P("## 2. The four entries outside the five categories");
  P();
  P("Handled per DATA_SPEC.md §3 and tagged `unclassifiable`; Dan rules on them in his study project. Phase 1 drills exclude them.");
  P();
  P("| Entry | Source classification | Source reading types | Canonical classification | Tags | Why it resists |");
  P("|---|---|---|---|---|---|");
  const why: Record<string, string> = {
    真っ赤: "か is not a dictionary on reading of 赤 (セキ, シャク); the source marks it `on` and its own reading_note doubts that. The 真っ+color set may be its own morphological category.",
    真っ青: "さお is not a standard reading of 青 (kun あお); archaic form surviving in this compound.",
    朝寝坊: "Three characters, kun + kun + on; no clean label in the four-category system. Classification is the derivation of the first two characters.",
    峠: "A single kanji, not a compound; a 国字 with only a kun reading, kept as the 国字 structural-constraint reference.",
  };
  const srcCls: Record<string, string> = { 真っ赤: "irregular", 真っ青: "irregular", 朝寝坊: "irregular", 峠: "n/a" };
  for (const e of entries.filter((x) => x.tags.includes("unclassifiable")))
    P(
      `| ${e.id} ${e.compound} ${e.reading} | \`${srcCls[e.compound] ?? "?"}\` | ${e.characters.map((c) => `${c.kanji} ${c.reading_in_compound} ${c.reading_type}`).join(", ")} | ${CLASSIFICATION_LABELS[e.classification]} | ${e.tags.join(", ")} | ${md(why[e.compound] ?? "")} |`,
    );
  P();

  P("## 3. Prose fields with self-correction markers (not rewritten)");
  P();
  P("Only 音読み (CLAUDE.md §6.5) was rewritten. Every other field matching wait / actually / hmm / correction / rethink is listed here untouched. In several the self-correction is the pedagogy; Dan decides which to clean.");
  P();
  P("| Entry | Field | Excerpt |");
  P("|---|---|---|");
  let selfCount = 0;
  for (const e of entries) {
    const fields: [string, string | null][] = [
      ["trap_note", e.trap_note],
      ["difficulty_rationale", e.difficulty_rationale],
      ["real_world_context", e.real_world_context],
      ["phonetic_change_detail", e.phonetic_change_detail],
      ...e.characters.map((c, i): [string, string | null] => [`characters[${i}].reading_note`, c.reading_note]),
    ];
    for (const [f, v] of fields) {
      if (!v) continue;
      const m = SELF_CORRECTION.exec(v);
      if (!m) continue;
      selfCount++;
      const at = m.index;
      P(`| ${e.id} ${e.compound} | \`${f}\` | …${md(v.slice(Math.max(0, at - 50), at + 60))}… |`);
    }
  }
  P();
  P(`${selfCount} fields on ${new Set(entries.filter((e) => [e.trap_note, e.difficulty_rationale, e.real_world_context, e.phonetic_change_detail, ...e.characters.map((c) => c.reading_note)].some((v) => v && SELF_CORRECTION.test(v))).map((e) => e.id)).size} entries.`);
  P();

  P("## 4. Prototype entries with no source entry (not inserted)");
  P();
  const protos = loadPrototype();
  const byKey = new Set(entries.map((e) => `${e.compound}|${e.reading}`));
  const unmatched = protos.filter((p) => !byKey.has(`${p.compound}|${p.reading}`));
  P("| Prototype ID | Compound | Reading | Prototype classification | Decision |");
  P("|---|---|---|---|---|");
  for (const p of unmatched) P(`| \`${p.id}\` | ${p.compound} | ${p.reading} | ${CLASSIFICATION_LABELS[p.cls as Classification] ?? p.cls} | not inserted — the prototype is not a source of entries (DATA_SPEC.md §4.2); Dan may add them in his study project |`);
  P();

  P("## 5. Chains with no members");
  P();
  const empty = chainsFile.chains.filter((c) => entries.every((e) => !e.chains.includes(c.character)));
  if (empty.length === 0) P("None.");
  for (const c of empty) P(`- **${c.character}** (display_order ${c.display_order}, rule_reliability \`${c.rule_reliability}\`): no entry contains ${c.character}. ${c.teaching_note ?? ""}`);
  P();

  P("## 6. Judgment calls and doubts for Dan to rule on");
  P();
  P("| Topic | Flag | Recommended answer | Decided |");
  P("|---|---|---|---|");
  for (const f of STATIC_FLAGS) P(`| ${md(f.topic)} | ${md(f.flag)} | ${md(f.recommendation)} | ${f.decided ? md(f.decided) : "open"} |`);
  P();
  P("Not fixed by design: 勝負 keeps its empty `phonetic_changes` (CLAUDE.md §6.6 asks the validator to flag it, section 1 above; DATA_SPEC.md §6 says the eventual fix is `other` with a detail note, which is Dan's to apply).");
  P();

  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------- main

if (process.argv[1] && process.argv[1].endsWith("validate.ts")) {
  const datasetRaw = JSON.parse(readFileSync(DATA, "utf8"));
  const chainsRaw = JSON.parse(readFileSync(CHAINS, "utf8"));
  const anchors = JSON.parse(readFileSync(ANCHORS, "utf8")) as Anchor[];
  const result = validateDataset(datasetRaw, chainsRaw, anchors);

  for (const i of result.errors) console.log(`ERROR  ${i.rule} — ${i.entry}: ${i.detail}`);
  for (const i of result.warns) console.log(`WARN   ${i.rule} — ${i.entry}: ${i.detail}`);
  console.log();
  console.log("Coverage (DATA_SPEC.md §7.7):");
  for (const line of result.coverage) console.log("  " + line);
  console.log();
  console.log(`ERRORs: ${result.errors.length}   WARNs: ${result.warns.length}   anchors checked: ${anchors.length}`);

  const parsed = DatasetSchema.safeParse(datasetRaw);
  const chainsParsed = ChainsFileSchema.safeParse(chainsRaw);
  if (parsed.success && chainsParsed.success) {
    writeFileSync(OUT_FLAGGED, flaggedReport(parsed.data, chainsParsed.data, result));
    console.log("wrote reports/02-flagged.md");
  }
  if (result.errors.length > 0) process.exit(1);
}
