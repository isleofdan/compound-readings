import { describe, expect, it } from "vitest";
import { buildCompact, loadCanonical, toCompact } from "./build-compact";

// DATA_SPEC.md §4.4 round-trip test: every compact field equals the canonical
// field it derives from. Catches transform drift immediately.
describe("compact transform round-trip", () => {
  const canonical = loadCanonical();
  const compact = buildCompact();

  it("is marked generated and carries every entry", () => {
    expect(compact.$generated).toBe(true);
    expect(compact.entries.length).toBe(canonical.entries.length);
  });

  it("every compact field equals its canonical source field", () => {
    canonical.entries.forEach((e, i) => {
      const c = compact.entries[i];
      expect(c).toEqual(toCompact(e));
      expect(c.id).toBe(e.id);
      expect(c.compound).toBe(e.compound);
      expect(c.reading).toBe(e.reading);
      expect(c.cls).toBe(e.classification);
      expect(c.diff).toBe(e.difficulty);
      expect(c.changes).toEqual(e.phonetic_changes);
      expect(c.changeDetail).toBe(e.phonetic_change_detail);
      expect(c.context).toBe(e.real_world_context);
      expect(c.trap).toBe(e.trap_note);
      expect(c.chains).toEqual(e.chains);
      expect(c.contested).toBe(e.contested);
      expect(c.contestedNote).toBe(e.contested_note);
      expect(c.tags).toEqual(e.tags);
      expect(c.chars.length).toBe(e.characters.length);
      c.chars.forEach((ch, j) => {
        const k = e.characters[j];
        expect(ch.k).toBe(k.kanji);
        expect(ch.r).toBe(k.reading_in_compound);
        expect(ch.t).toBe(k.reading_type);
        expect(ch.on).toEqual(k.on_readings);
        expect(ch.kun).toEqual(k.kun_readings);
        expect(ch.note).toBe(k.reading_note);
      });
      expect(c.alternates.length).toBe(e.alternate_readings.length);
      c.alternates.forEach((a, j) => {
        const s = e.alternate_readings[j];
        expect(a.reading).toBe(s.reading);
        expect(a.cls).toBe(s.classification);
        expect(a.status).toBe(s.status);
        expect(a.context).toBe(s.context);
        expect(a.sourceStatus).toBe(s.source_status);
      });
    });
  });

  it("reconstructs the canonical field values from the compact entry", () => {
    for (const e of canonical.entries) {
      const c = toCompact(e);
      const back = {
        id: c.id,
        compound: c.compound,
        reading: c.reading,
        classification: c.cls,
        difficulty: c.diff,
        phonetic_changes: c.changes,
        phonetic_change_detail: c.changeDetail,
        real_world_context: c.context,
        trap_note: c.trap,
        chains: c.chains,
        contested: c.contested,
        contested_note: c.contestedNote,
        tags: c.tags,
        characters: c.chars.map((ch) => ({ kanji: ch.k, reading_in_compound: ch.r, reading_type: ch.t, on_readings: ch.on, kun_readings: ch.kun, reading_note: ch.note })),
        alternate_readings: c.alternates.map((a) => ({ reading: a.reading, classification: a.cls, status: a.status, context: a.context, source_status: a.sourceStatus })),
      };
      const { source_id: _s, source_batch: _b, char_count: _cc, has_kana: _hk, decomposable: _d, difficulty_rationale: _dr, ...expected } = e;
      expect(back).toEqual(expected);
    }
  });
});
