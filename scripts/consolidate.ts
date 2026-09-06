// Consolidation: the four source batch files → data/compounds.json (BUILD_PLAN.md
// 0.4, DATA_SPEC.md §4). Run: npm run consolidate
//
// Reads data/source/** (never written), maps every entry per DATA_SPEC.md §4.1,
// assigns canonical IDs, normalizes tokens, maps alternate-reading status,
// applies the named fixes in scripts/fixes.ts, and writes
// reports/01-migration.md accounting for every entry, every field, every ID,
// every token, every status string, every judgment call and every fix. Output
// carries no timestamp; two runs on unchanged inputs are byte-identical.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DatasetSchema,
  deriveClassification,
  type AlternateReading,
  type AlternateStatus,
  type Character,
  type Classification,
  type Entry,
  type PhoneticChange,
} from "../src/data/schema";
import { CLASSIFICATION_LABELS, PHONETIC_CHANGE_LABELS } from "../src/data/labels";
import { FIXES, type Fix } from "./fixes";
import { SOURCE_DIR, SOURCE_FILES } from "./source-count";

const ROOT = process.cwd();
const OUT_DATA = join(ROOT, "data", "compounds.json");
const OUT_REPORT = join(ROOT, "reports", "01-migration.md");

// ---------------------------------------------------------------- source shapes

type SourceChar = {
  kanji: string;
  reading_in_compound: string | null;
  reading_type: string;
  on_readings: string[];
  kun_readings: string[];
  reading_note: string | null;
  [k: string]: unknown;
};
type SourceAlt = { reading: string; classification: string; context: string; status: string; [k: string]: unknown };
type SourceEntry = {
  id: string;
  compound: string;
  reading: string;
  characters: SourceChar[];
  classification: string;
  phonetic_changes: string[];
  phonetic_change_detail: string | null;
  difficulty: number;
  difficulty_rationale: string;
  real_world_context: string;
  trap_note: string | null;
  alternate_readings?: SourceAlt[];
  [k: string]: unknown;
};

const ENTRY_FIELDS_MAPPED = [
  "id",
  "compound",
  "reading",
  "characters",
  "classification",
  "phonetic_changes",
  "phonetic_change_detail",
  "difficulty",
  "difficulty_rationale",
  "real_world_context",
  "trap_note",
  "alternate_readings",
];
const CHAR_FIELDS_MAPPED = ["kanji", "reading_in_compound", "reading_type", "on_readings", "kun_readings", "reading_note"];
const ALT_FIELDS_MAPPED = ["reading", "classification", "context", "status"];

// ---------------------------------------------------------------- helpers

const isKanji = (ch: string) => /\p{Script=Han}/u.test(ch);
const isKana = (ch: string) => /[ぁ-ゖァ-ヺー]/u.test(ch);
const kanjiOf = (s: string) => [...s].filter(isKanji);

function md(s: unknown): string {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
function cls(c: string): string {
  return c in CLASSIFICATION_LABELS ? `${CLASSIFICATION_LABELS[c as Classification]} (${c})` : `\`${c}\``;
}
function count<T>(xs: T[], key: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return m;
}

// DATA_SPEC.md §6 — token normalization. `other` whose detail names 半濁音化 is
// promoted to `handakuon` (the four entries the spec names).
function normalizeToken(token: string, detail: string | null): { code: PhoneticChange; promoted: boolean } {
  const t = token.trim();
  const table: Record<string, PhoneticChange> = {
    rendaku: "rendaku",
    連濁: "rendaku",
    sokuon: "sokuon",
    促音: "sokuon",
    handakuon: "handakuon",
    半濁音: "handakuon",
    半濁音化: "handakuon",
    long_vowel: "long_vowel",
    長音化: "long_vowel",
    vowel_change: "vowel_change",
    母音変化: "vowel_change",
    other: "other",
    その他: "other",
  };
  if (t === "other" && (detail ?? "").includes("半濁音化")) return { code: "handakuon", promoted: true };
  const code = table[t];
  if (!code) throw new Error(`unknown phonetic_changes token: ${token}`);
  return { code, promoted: false };
}

// DATA_SPEC.md §7.3 — status mapping, applied in order, first match wins.
function mapStatus(s: string): { status: AlternateStatus; rule: string } {
  if (s.startsWith("standard")) return { status: "standard", rule: 'begins with "standard"' };
  if (["NHC changed", "NHK changed", "increasingly accepted", "permit"].some((k) => s.includes(k)))
    return { status: "variant_accepted", rule: 'contains "NHC changed" / "NHK changed" / "increasingly accepted" / "permit"' };
  if (["widespread but contested", "originally non-standard"].some((k) => s.includes(k)))
    return { status: "variant_spreading", rule: 'contains "widespread but contested" / "originally non-standard"' };
  if (s.includes("domain-specific")) return { status: "standard", rule: 'contains "domain-specific"' };
  return { status: "disputed", rule: "unmatched → disputed" };
}

// DATA_SPEC.md §7.4 — the eight contested compounds and the table text.
const CONTESTED_TABLE: Record<string, { prescriptive: string; variant: string; note: string }> = {
  貼付: { prescriptive: "ちょうふ", variant: "てんぷ", note: "Both widely accepted" },
  施行: { prescriptive: "しこう", variant: "せこう", note: "Semantic split: law vs construction" },
  代替: { prescriptive: "だいたい", variant: "だいがえ", note: "Spreading; disambiguates from 大体" },
  重複: { prescriptive: "ちょうふく", variant: "じゅうふく", note: "NHK permits both" },
  依存: { prescriptive: "いそん", variant: "いぞん", note: "NHK changed its guidance in 2014" },
  続柄: { prescriptive: "つづきがら", variant: "ぞくがら", note: "Variant dominant in speech" },
  遊説: { prescriptive: "ゆうぜい", variant: "ゆうせつ", note: "Native speakers commonly err" },
  一段落: { prescriptive: "いちだんらく", variant: "ひとだんらく", note: "Widespread variant" },
};
const CONTESTED_STATUSES: AlternateStatus[] = ["variant_accepted", "variant_spreading", "disputed"];

// ---------------------------------------------------------------- load

type Loaded = { batch: number; file: string; topLevel: Record<string, unknown>; entries: SourceEntry[] };
function load(): Loaded[] {
  return SOURCE_FILES.map((file, i) => {
    const parsed = JSON.parse(readFileSync(join(SOURCE_DIR, file), "utf8")) as Record<string, unknown>;
    const { entries, ...topLevel } = parsed;
    return { batch: i + 1, file, topLevel, entries: entries as SourceEntry[] };
  });
}

// ---------------------------------------------------------------- fixes

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    const m = /^(\w+)(?:\[(\d+)\])?$/.exec(part);
    if (!m) throw new Error(`bad path ${path}`);
    cur = (cur as Record<string, unknown>)[m[1]];
    if (m[2] !== undefined) cur = (cur as unknown[])[Number(m[2])];
  }
  return cur;
}
function setPath(obj: unknown, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (let i = 0; i < parts.length; i++) {
    const m = /^(\w+)(?:\[(\d+)\])?$/.exec(parts[i])!;
    const last = i === parts.length - 1;
    if (m[2] !== undefined) {
      const arr = (cur as Record<string, unknown>)[m[1]] as unknown[];
      if (last) arr[Number(m[2])] = value;
      else cur = arr[Number(m[2])];
    } else if (last) (cur as Record<string, unknown>)[m[1]] = value;
    else cur = (cur as Record<string, unknown>)[m[1]];
  }
}

type AppliedFix = Fix & { applied: true };

// ---------------------------------------------------------------- consolidate

export type Judgment = { source_id: string; compound: string; what: string; decision: string };

export type Consolidation = {
  batches: Loaded[];
  entries: Entry[];
  idTable: { id: string; source_id: string; source_batch: number; compound: string; reading: string }[];
  unexpectedEntryFields: Map<string, number>;
  unexpectedCharFields: Map<string, number>;
  unexpectedAltFields: Map<string, number>;
  tokenRows: { batch: number; source_id: string; compound: string; from: string; to: PhoneticChange; promoted: boolean }[];
  statusRows: { source_id: string; compound: string; reading: string; from: string; to: AlternateStatus; rule: string }[];
  judgments: Judgment[];
  fixes: AppliedFix[];
};

export function consolidate(): Consolidation {
  const batches = load();
  const entries: Entry[] = [];
  const idTable: Consolidation["idTable"] = [];
  const unexpectedEntryFields = new Map<string, number>();
  const unexpectedCharFields = new Map<string, number>();
  const unexpectedAltFields = new Map<string, number>();
  const tokenRows: Consolidation["tokenRows"] = [];
  const statusRows: Consolidation["statusRows"] = [];
  const judgments: Judgment[] = [];
  const fixes: AppliedFix[] = [];

  // Deep-copy the source entries so patches never touch the loaded originals.
  const work = batches.map((b) => ({ ...b, entries: JSON.parse(JSON.stringify(b.entries)) as SourceEntry[] }));

  // Apply the named fixes on the source-shaped copies, asserting `before`.
  const fixesLeft = [...FIXES];
  for (const b of work)
    for (const src of b.entries)
      for (const fix of FIXES.filter((f) => f.source_id === src.id)) {
        if (src.compound !== fix.compound) throw new Error(`fix ${fix.defect}: ${fix.source_id} is ${src.compound}, not ${fix.compound}`);
        const cur = getPath(src, fix.path);
        if (cur !== fix.before)
          throw new Error(`fix ${fix.defect} on ${fix.source_id} ${fix.path}: expected ${JSON.stringify(fix.before)}, found ${JSON.stringify(cur)}`);
        setPath(src, fix.path, fix.after);
        fixes.push({ ...fix, applied: true });
        fixesLeft.splice(fixesLeft.indexOf(fix), 1);
      }
  if (fixesLeft.length) throw new Error(`fixes not applied (source_id not found): ${fixesLeft.map((f) => f.source_id).join(", ")}`);

  let n = 0;
  for (const b of work) {
    for (const src of b.entries) {
      n++;
      const id = `cr_${String(n).padStart(4, "0")}`;
      for (const k of Object.keys(src)) if (!ENTRY_FIELDS_MAPPED.includes(k)) unexpectedEntryFields.set(k, (unexpectedEntryFields.get(k) ?? 0) + 1);

      const compound = src.compound.normalize("NFC");
      const reading = src.reading.normalize("NFC");
      const kanji = kanjiOf(compound);
      const has_kana = [...compound].some(isKana);

      const characters: Character[] = src.characters.map((c) => {
        for (const k of Object.keys(c)) if (!CHAR_FIELDS_MAPPED.includes(k)) unexpectedCharFields.set(k, (unexpectedCharFields.get(k) ?? 0) + 1);
        return {
          kanji: c.kanji,
          reading_in_compound: c.reading_in_compound === "" || c.reading_in_compound === "—" ? null : c.reading_in_compound,
          reading_type: c.reading_type as Character["reading_type"],
          on_readings: [...c.on_readings],
          kun_readings: [...c.kun_readings],
          reading_note: c.reading_note === "" ? null : c.reading_note,
        };
      });

      // Classification — DATA_SPEC.md §3.
      const tags: string[] = [];
      let classification: Classification;
      if (["on_on", "kun_kun", "juubako", "yutou", "jukujikun"].includes(src.classification)) {
        classification = src.classification as Classification;
      } else if (src.classification === "irregular" && characters.length >= 2) {
        const d = deriveClassification(characters[0].reading_type, characters[1].reading_type);
        if (!d) throw new Error(`${src.id}: cannot derive from ${characters.map((c) => c.reading_type).join("+")}`);
        classification = d;
        tags.push("unclassifiable");
        judgments.push({
          source_id: src.id,
          compound,
          what: `classification \`irregular\` (source reading types: ${characters.map((c) => `${c.kanji} ${c.reading_in_compound} ${c.reading_type}`).join(", ")})`,
          decision: `set to ${cls(d)} — ${characters.length === 2 ? "the derivation of the source's own reading types" : "the two-character derivation applied to the first two characters"} (DATA_SPEC.md §3); tagged \`unclassifiable\`; flagged for Dan in reports/02-flagged.md`,
        });
      } else if (src.classification === "n/a" && characters.length === 1) {
        classification = "kun_kun";
        tags.push("kokuji", "unclassifiable");
        judgments.push({
          source_id: src.id,
          compound,
          what: "classification `n/a` (a single kanji, 国字, not a compound)",
          decision:
            "kept, not dropped (DATA_SPEC.md §3): char_count 1, classification 訓訓 (kun_kun) as closest fit, tags `kokuji` and `unclassifiable`, excluded from derivation by the char_count rule; flagged for Dan",
        });
      } else {
        throw new Error(`${src.id}: unhandled classification ${src.classification}`);
      }

      // Phonetic changes — DATA_SPEC.md §6.
      const phonetic_changes: PhoneticChange[] = [];
      for (const t of src.phonetic_changes) {
        const { code, promoted } = normalizeToken(t, src.phonetic_change_detail);
        phonetic_changes.push(code);
        tokenRows.push({ batch: b.batch, source_id: src.id, compound, from: t, to: code, promoted });
      }

      // Alternate readings — DATA_SPEC.md §2.2, §7.3.
      const alternate_readings: AlternateReading[] = (src.alternate_readings ?? []).map((a) => {
        for (const k of Object.keys(a)) if (!ALT_FIELDS_MAPPED.includes(k)) unexpectedAltFields.set(k, (unexpectedAltFields.get(k) ?? 0) + 1);
        const { status, rule } = mapStatus(a.status);
        statusRows.push({ source_id: src.id, compound, reading: a.reading, from: a.status, to: status, rule });
        let altCls: Classification;
        if (["on_on", "kun_kun", "juubako", "yutou", "jukujikun"].includes(a.classification)) altCls = a.classification as Classification;
        else if (a.classification === "irregular") {
          // ひとだんらく: kun + on + on. Same rule as 朝寝坊 — derivation on the first two characters.
          altCls = "yutou";
          judgments.push({
            source_id: src.id,
            compound,
            what: `alternate reading ${a.reading} carries classification \`irregular\` (source context: ${a.context})`,
            decision:
              "set to 湯桶 (yutou) — the two-character derivation applied to the first two characters (kun + on), the same rule DATA_SPEC.md §3 applies to 朝寝坊; flagged for Dan",
          });
        } else throw new Error(`${src.id}: alternate classification ${a.classification}`);
        return { reading: a.reading, classification: altCls, context: a.context, status, source_status: a.status };
      });

      // Contested — DATA_SPEC.md §4.1, §7.4.
      const inTable = CONTESTED_TABLE[compound];
      const contestedByAlt = alternate_readings.filter((a) => CONTESTED_STATUSES.includes(a.status));
      const contested = contestedByAlt.length > 0 || inTable !== undefined;
      let contested_note: string | null = null;
      if (contested) {
        if (contestedByAlt.length > 0) {
          contested_note = contestedByAlt
            .map((a) => `${a.reading} (${a.source_status}): ${a.context}`)
            .join(" ");
        } else if (inTable) {
          contested_note = `Prescriptive ${inTable.prescriptive}, variant ${inTable.variant} — ${inTable.note}. (From DATA_SPEC.md §7.4; the source entry records no alternate reading.)`;
          judgments.push({
            source_id: src.id,
            compound,
            what: "in the DATA_SPEC.md §7.4 contested table but the source entry has no alternate_readings",
            decision: "contested forced true; contested_note taken from the §7.4 table text and says so",
          });
        }
      }

      const entry: Entry = {
        id,
        source_id: src.id,
        source_batch: b.batch,
        compound,
        reading,
        char_count: kanji.length,
        has_kana,
        classification,
        decomposable: classification !== "jukujikun",
        characters,
        alternate_readings,
        contested,
        contested_note,
        phonetic_changes,
        phonetic_change_detail: src.phonetic_change_detail === "" ? null : src.phonetic_change_detail,
        difficulty: src.difficulty,
        difficulty_rationale: src.difficulty_rationale,
        real_world_context: src.real_world_context,
        trap_note: src.trap_note === "" ? null : src.trap_note,
        chains: [],
        tags,
      };
      entries.push(entry);
      idTable.push({ id, source_id: src.id, source_batch: b.batch, compound, reading });
    }
  }

  return { batches, entries, idTable, unexpectedEntryFields, unexpectedCharFields, unexpectedAltFields, tokenRows, statusRows, judgments, fixes };
}

// ---------------------------------------------------------------- report

export function migrationReport(c: Consolidation): string {
  const L: string[] = [];
  const P = (s = "") => L.push(s);
  const total = c.entries.length;

  P("# 01-migration.md — Source batches → canonical dataset");
  P();
  P("Generated by `scripts/consolidate.ts` (`npm run consolidate`). Every number below is");
  P("computed from the files under `data/source/` while writing `data/compounds.json`.");
  P("Two consecutive runs on unchanged inputs produce this file and the dataset byte for");
  P("byte. Source files are read-only and were not changed.");
  P();

  P("## 1. Entries in, entries out");
  P();
  P("| Batch | File | Entries in | Entries out |");
  P("|---|---|---|---|");
  for (const b of c.batches) P(`| ${b.batch} | \`${b.file}\` | ${b.entries.length} | ${c.entries.filter((e) => e.source_batch === b.batch).length} |`);
  P(`| **Total** | | **${c.batches.reduce((s, b) => s + b.entries.length, 0)}** | **${total}** |`);
  P();
  P("Every source entry became exactly one canonical entry. Nothing was dropped, including 峠 (kept per DATA_SPEC.md §3).");
  P();

  P("## 2. Fields");
  P();
  P("Entry-level source fields and where each lands (DATA_SPEC.md §4.1):");
  P();
  P("| Source field | Canonical field | Transform |");
  P("|---|---|---|");
  P("| `id` | `source_id` | verbatim; a new opaque `id` is assigned (§3 below) |");
  P("| `compound` | `compound` | verbatim, NFC (kana kept as written) |");
  P("| `reading` | `reading` | verbatim, NFC |");
  P("| `characters[]` | `characters[]` | field names identical; `reading_type` values pass through; `\"\"`/`—` readings → null |");
  P("| `classification` | `classification` | five framework values verbatim; `irregular` and `n/a` per §6 below |");
  P("| `phonetic_changes[]` | `phonetic_changes[]` | normalized per §4 below |");
  P("| `phonetic_change_detail` | same | verbatim |");
  P("| `difficulty` | same | verbatim |");
  P("| `difficulty_rationale` | same | verbatim (fixes, §8) |");
  P("| `real_world_context` | same | verbatim |");
  const emptyTraps = c.batches.flatMap((b) => b.entries).filter((e) => e.trap_note === "").length;
  P(`| \`trap_note\` | same | verbatim; \`""\` → null (${emptyTraps} occurrences) (fixes, §8) |`);
  P("| `alternate_readings[]` | `alternate_readings[]` | `reading`, `classification`, `context` verbatim; `status` → `source_status` verbatim and `status` mapped (§5) |");
  P("| — | `source_batch`, `char_count`, `has_kana`, `decomposable`, `contested`, `contested_note`, `chains`, `tags` | computed |");
  P();
  const dropped = [...c.unexpectedEntryFields.entries(), ...c.unexpectedCharFields.entries(), ...c.unexpectedAltFields.entries()];
  P(`Source entry fields dropped: **${dropped.length === 0 ? "none" : dropped.length}**.`);
  if (dropped.length) {
    P();
    P("| Field | Occurrences |");
    P("|---|---|");
    for (const [k, v] of dropped) P(`| \`${k}\` | ${v} |`);
  } else {
    P("Every entry-level, character-level and alternate-level field present in any source entry is in the table above; no unexpected field was found on any of the " + total + " entries.");
  }
  P();
  P("File-level keys (not entry fields) not carried into the dataset:");
  P();
  for (const b of c.batches) P(`- batch ${b.batch}: ${Object.keys(b.topLevel).map((k) => `\`${k}\``).join(", ")}`);
  P();

  P(`## 3. Canonical IDs assigned: ${c.idTable.length}`);
  P();
  P("Sequential in batch order, then source file order (DATA_SPEC.md §4.3). Opaque — no code may read meaning into them.");
  P();
  P("| Canonical | Source ID | Batch | Compound | Reading |");
  P("|---|---|---|---|---|");
  for (const r of c.idTable) P(`| \`${r.id}\` | \`${r.source_id}\` | ${r.source_batch} | ${r.compound} | ${r.reading} |`);
  P();

  P("## 4. Phonetic-change tokens normalized");
  P();
  const tokenCounts = count(c.tokenRows, (r) => `${r.from} → ${r.to}${r.promoted ? " (promoted)" : ""}`);
  P("| Source token | Canonical code | Occurrences |");
  P("|---|---|---|");
  for (const [k, v] of [...tokenCounts.entries()].sort()) {
    const [from, rest] = k.split(" → ");
    P(`| \`${from}\` | \`${rest.replace(" (promoted)", "")}\`${rest.includes("promoted") ? " — 半濁音化 promotion" : ""} | ${v} |`);
  }
  P();
  const promoted = c.tokenRows.filter((r) => r.promoted);
  P(`半濁音化 promotion (DATA_SPEC.md §6): ${promoted.length} entries carried \`other\` with 半濁音化 named in \`phonetic_change_detail\` and were promoted to \`handakuon\`: ${promoted.map((r) => `${r.compound} (\`${r.source_id}\`)`).join(", ")}.`);
  P();
  const byCode = count(c.entries.flatMap((e) => e.phonetic_changes), (t) => t);
  P("Resulting token counts over the canonical dataset:");
  P();
  P("| Code | Display | Entries |");
  P("|---|---|---|");
  for (const code of Object.keys(PHONETIC_CHANGE_LABELS) as PhoneticChange[]) P(`| \`${code}\` | ${PHONETIC_CHANGE_LABELS[code]} | ${byCode.get(code) ?? 0} |`);
  P();

  P("## 5. Alternate-reading status strings mapped");
  P();
  const distinct = new Map<string, { to: AlternateStatus; rule: string; n: number; where: string[] }>();
  for (const r of c.statusRows) {
    const d = distinct.get(r.from) ?? { to: r.to, rule: r.rule, n: 0, where: [] };
    d.n++;
    d.where.push(`${r.compound} ${r.reading}`);
    distinct.set(r.from, d);
  }
  P(`${distinct.size} distinct source strings across ${c.statusRows.length} alternates, mapped by the DATA_SPEC.md §7.3 rule table:`);
  P();
  P("| Source `status` (kept verbatim as `source_status`) | → `status` | Rule | Count | Alternates |");
  P("|---|---|---|---|---|");
  for (const [from, d] of [...distinct.entries()].sort()) P(`| \`${md(from)}\` | \`${d.to}\` | ${d.rule} | ${d.n} | ${d.where.join(", ")} |`);
  P();
  const unmatched = [...distinct.entries()].filter(([, d]) => d.rule.startsWith("unmatched"));
  P(`Unmatched strings (fell to \`disputed\`): ${unmatched.length}${unmatched.length ? " — " + unmatched.map(([f, d]) => `\`${md(f)}\` (${d.where.join(", ")})`).join("; ") : ""}.`);
  P();

  P("## 6. Judgment calls");
  P();
  P("| Source ID | Compound | What | Decision |");
  P("|---|---|---|---|");
  for (const j of c.judgments) P(`| \`${j.source_id}\` | ${j.compound} | ${md(j.what)} | ${md(j.decision)} |`);
  P();

  P("## 7. Contested readings (DATA_SPEC.md §4.1, §7.4)");
  P();
  const contested = c.entries.filter((e) => e.contested);
  P(`Entries with \`contested: true\`: ${contested.length} — ${contested.map((e) => e.compound).join(", ")}.`);
  P();
  P("| Compound | Source ID | Why contested | `contested_note` |");
  P("|---|---|---|---|");
  for (const e of contested) {
    const why = e.alternate_readings.some((a) => CONTESTED_STATUSES.includes(a.status))
      ? "alternate with status " + e.alternate_readings.filter((a) => CONTESTED_STATUSES.includes(a.status)).map((a) => `\`${a.status}\``).join(", ") + (e.compound in CONTESTED_TABLE ? "; also in the §7.4 table" : "")
      : "§7.4 table only";
    P(`| ${e.compound} | \`${e.source_id}\` | ${why} | ${md(e.contested_note)} |`);
  }
  P();

  P("## 8. Fixes applied (scripts/fixes.ts)");
  P();
  P("Each fix is a named patch on one field, asserted against the source value before writing. Source files are unchanged.");
  P();
  P("| Defect | Source ID | Compound | Field | Before | After | Reason |");
  P("|---|---|---|---|---|---|---|");
  for (const f of c.fixes) P(`| ${md(f.defect)} | \`${f.source_id}\` | ${f.compound} | \`${f.path}\` | ${md(f.before)} | ${md(f.after)} | ${md(f.reason)} |`);
  P();
  for (const f of c.fixes.filter((f) => f.verified_against)) P(`Defect ${f.defect} dictionary check, as CLAUDE.md §6.5 requires: ${f.verified_against}`);
  P();

  P("## 9. Derived fields");
  P();
  const byCls = count(c.entries, (e) => e.classification);
  P("| Classification | Entries |");
  P("|---|---|");
  for (const k of Object.keys(CLASSIFICATION_LABELS) as Classification[]) P(`| ${cls(k)} | ${byCls.get(k) ?? 0} |`);
  P(`| **Total** | **${total}** |`);
  P();
  const kana = c.entries.filter((e) => e.has_kana);
  P(`\`has_kana\` true: ${kana.length} — ${kana.map((e) => e.compound).join(", ")}.`);
  const cc = count(c.entries, (e) => String(e.char_count));
  P(`\`char_count\`: ${[...cc.entries()].sort().map(([k, v]) => `${k} kanji × ${v}`).join(", ")}.`);
  const tagged = c.entries.filter((e) => e.tags.length);
  P(`\`tags\` applied: ${tagged.map((e) => `${e.compound} [${e.tags.join(", ")}]`).join("; ")}. No other tag was applied; candidate tags the source supports are listed in reports/02-flagged.md for Dan.`);
  P(`\`decomposable\` false: ${c.entries.filter((e) => !e.decomposable).length} (the 熟字訓 entries).`);
  P();

  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------- main

export function writeOutputs(c: Consolidation): void {
  const dataset = { $schema_version: "1.0.0" as const, entries: c.entries };
  const parsed = DatasetSchema.safeParse(dataset);
  if (!parsed.success) {
    console.error(parsed.error.issues.slice(0, 20));
    throw new Error("consolidated dataset does not conform to the schema");
  }
  writeFileSync(OUT_DATA, JSON.stringify(dataset, null, 2) + "\n");
  writeFileSync(OUT_REPORT, migrationReport(c));
}

if (process.argv[1] && process.argv[1].endsWith("consolidate.ts")) {
  const c = consolidate();
  writeOutputs(c);
  console.log(`consolidated ${c.entries.length} entries → data/compounds.json; report → reports/01-migration.md`);
}
