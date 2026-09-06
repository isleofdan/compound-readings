import type { CompactEntry } from "../data/compact";
import { CHAIN_BY_CHARACTER, LESSON_CHAINS, isException, isLesson, type ResolvedChain } from "../data/index";
import { EXCEPTION_LABEL, READING_TYPE_LABELS, RELIABILITY_LABELS } from "../data/labels";
import type { ChainsRoute, Navigate } from "../router";
import { ChainCard } from "../ui/ChainCard";

// Chain Explorer (BUILD_PLAN.md 1.2), ported from the prototype's ChainExplorer:
// a list of lesson chains, then one chain walked in entry_order, one reveal per
// tap, "reveal all" as a shortcut, and the rule shown only once every entry is
// revealed. Nothing is revealed before a tap and no rule text appears on the
// list (Session 3 brief §5 rule 2). Which cards are revealed lives in memory in
// the app shell so it survives a tab switch within the session; a reload
// starts the chain fresh.

export type RevealState = { revealed: Record<string, string[]>; revealAll: Record<string, boolean> };
export const EMPTY_REVEAL_STATE: RevealState = { revealed: {}, revealAll: {} };

function ChainList({ navigate }: { navigate: Navigate }) {
  return (
    <div className="px-3 pt-4 text-neutral-900">
      <h1 className="text-xl font-bold">鎖 — Chains</h1>
      <p className="mt-1 text-sm text-neutral-700">One character across its partner words. Say how each is read before you tap.</p>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {LESSON_CHAINS.map((c) => (
          <li key={c.character}>
            <button
              type="button"
              onClick={() => navigate({ tab: "chains", chain: c.character })}
              className="flex min-h-28 w-full flex-col items-start rounded-2xl border border-neutral-300 bg-white p-4 text-left shadow-sm"
            >
              <span className="text-5xl font-bold">{c.character}</span>
              <span className="mt-2 text-sm text-neutral-700">{c.entries.length} entries</span>
              <span className="text-sm font-semibold text-neutral-900">{RELIABILITY_LABELS[c.reliability]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotALesson({ character, chain, navigate }: { character: string; chain: ResolvedChain | undefined; navigate: Navigate }) {
  const message = !chain
    ? `${character} is not a chain in the dataset.`
    : chain.entries.length === 0
      ? `${character} has no entries yet — this chain is described, not yet built.`
      : `${character} has ${chain.entries.length} entries but no stated rule; it is a list, not a lesson.`;
  return (
    <div className="px-3 pt-4 text-neutral-900">
      <h1 className="text-xl font-bold">{character}</h1>
      <p className="mt-2 text-sm text-neutral-700">{message}</p>
      {chain && chain.entries.length > 0 && (
        <button
          type="button"
          onClick={() => navigate({ tab: "browse", q: character, cls: null, pc: null, open: null })}
          className="mt-3 min-h-11 rounded-xl border border-neutral-400 bg-white px-4 font-semibold"
        >
          See the {character} words in Browse
        </button>
      )}
      <ActionRow onBack={() => navigate({ tab: "chains", chain: null })} />
    </div>
  );
}

function ActionRow({ onBack, revealAll, onToggleRevealAll }: { onBack: () => void; revealAll?: boolean; onToggleRevealAll?: () => void }) {
  return (
    <div className="fixed inset-x-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur" style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-md gap-2 px-3 py-2">
        <button type="button" onClick={onBack} className="min-h-11 flex-1 rounded-xl border border-neutral-400 bg-white font-semibold">
          ← Chains
        </button>
        {onToggleRevealAll && (
          <button type="button" onClick={onToggleRevealAll} aria-pressed={revealAll} className="min-h-11 flex-1 rounded-xl border border-neutral-400 bg-white font-semibold">
            {revealAll ? "Hide all" : "Reveal all"}
          </button>
        )}
      </div>
    </div>
  );
}

function RulePanel({ chain }: { chain: ResolvedChain }) {
  const exceptionChar = (e: CompactEntry) => e.chars.find((c) => c.k === chain.character);
  return (
    <section aria-label="Rule" className="mt-4 rounded-2xl border-2 border-neutral-900 bg-neutral-50 p-4 text-sm">
      <div className="text-base font-bold">
        {chain.character} · {RELIABILITY_LABELS[chain.reliability]}
      </div>
      {chain.rule && <p className="mt-2 text-neutral-900">{chain.rule}</p>}
      {chain.reliability === "usually" && <p className="mt-2 text-neutral-700">Usually, not always — expect exceptions.</p>}
      {chain.exceptions.length > 0 && (
        <p className="mt-2 rounded border-l-4 border-red-700 bg-red-50 px-2 py-1 text-neutral-900">
          <span className="font-semibold">{EXCEPTION_LABEL}:</span>{" "}
          {chain.exceptions.map((e, i) => {
            const c = exceptionChar(e);
            return (
              <span key={e.id}>
                {i > 0 && "; "}
                <span className="font-semibold">{e.compound}</span> ({e.reading}){c && c.r ? ` — ${chain.character} = ${c.r} ${READING_TYPE_LABELS[c.t]}` : ""}
              </span>
            );
          })}
        </p>
      )}
    </section>
  );
}

function ChainScreen({ chain, state, setState, navigate }: { chain: ResolvedChain; state: RevealState; setState: (s: RevealState) => void; navigate: Navigate }) {
  const key = chain.character;
  const revealedIds = new Set(state.revealed[key] ?? []);
  const revealAll = state.revealAll[key] ?? false;
  const isRevealed = (e: CompactEntry) => revealAll || revealedIds.has(e.id);
  const allRevealed = chain.entries.length > 0 && chain.entries.every(isRevealed);

  const reveal = (e: CompactEntry) => setState({ ...state, revealed: { ...state.revealed, [key]: [...revealedIds, e.id] } });
  const toggleRevealAll = () => setState({ ...state, revealAll: { ...state.revealAll, [key]: !revealAll } });

  return (
    <div className="px-3 pt-4 text-neutral-900">
      <header className="text-center">
        <span className="text-5xl font-bold">{chain.character}</span>
        <span className="ml-3 text-sm text-neutral-700">{chain.entries.length} entries</span>
      </header>
      <ul className="mt-4 space-y-3">
        {chain.entries.map((e) => (
          <ChainCard key={e.id} e={e} revealed={isRevealed(e)} exception={isException(chain, e)} onReveal={() => reveal(e)} />
        ))}
      </ul>
      {allRevealed && <RulePanel chain={chain} />}
      <ActionRow onBack={() => navigate({ tab: "chains", chain: null })} revealAll={revealAll} onToggleRevealAll={toggleRevealAll} />
    </div>
  );
}

export function ChainExplorer({ route, navigate, state, setState }: { route: ChainsRoute; navigate: Navigate; state: RevealState; setState: (s: RevealState) => void }) {
  if (route.chain === null) return <ChainList navigate={navigate} />;
  const chain = CHAIN_BY_CHARACTER.get(route.chain);
  if (!chain || !isLesson(chain)) return <NotALesson character={route.chain} chain={chain} navigate={navigate} />;
  return <ChainScreen chain={chain} state={state} setState={setState} navigate={navigate} />;
}
