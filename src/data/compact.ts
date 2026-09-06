// The shape of data/generated/compounds.compact.json — the only data file the
// app imports. Types only; the transform that produces the file lives in
// scripts/build-compact.ts and imports these so the two cannot drift.
import type { AlternateStatus, Classification, PhoneticChange, ReadingType } from "./schema";

export type CompactChar = { k: string; r: string | null; t: ReadingType; on: string[]; kun: string[]; note: string | null };
export type CompactAlternate = { reading: string; cls: Classification; status: AlternateStatus; context: string; sourceStatus: string };
export type CompactEntry = {
  id: string;
  compound: string;
  reading: string;
  chars: CompactChar[];
  cls: Classification;
  diff: number;
  changes: PhoneticChange[];
  changeDetail: string | null;
  context: string;
  trap: string | null;
  chains: string[];
  alternates: CompactAlternate[];
  contested: boolean;
  contestedNote: string | null;
  tags: string[];
};
export type CompactFile = { $generated: true; $schema_version: string; $warning: string; entries: CompactEntry[] };
