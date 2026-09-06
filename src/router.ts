// Hash routing (Session 3 brief §5 rule 6): every screen is addressable by URL
// and a reload lands on the same screen. Routes:
//   #/chains            the chain list
//   #/chains/手         one chain
//   #/browse            Browse (the Session 2 inspection page)
//   #/browse?q=場&cls=yutou&pc=rendaku&open=cr_0027
//   #/drill             Classification Drill; filters as ?cls=yutou&diff=3&pc=rendaku
//   #/predict           Prediction Challenge; the same filter keys
// Only the URL is stored; in-memory state (which cards are revealed, the
// drill's current item and tally) is not — the drill item is random, so only
// its filters are addressable (Session 4 brief §5 rule 7).
import { useCallback, useSyncExternalStore } from "react";
import { CLASSIFICATION_ORDER, PHONETIC_CHANGE_ORDER } from "./data/labels";
import type { Classification, PhoneticChange } from "./data/schema";

export type ChainsRoute = { tab: "chains"; chain: string | null };
export type BrowseRoute = { tab: "browse"; q: string; cls: Classification | null; pc: PhoneticChange | null; open: string | null };
export type DifficultyLevel = 1 | 2 | 3 | 4;
export type DrillFilters = { cls: Classification | null; diff: DifficultyLevel | null; pc: PhoneticChange | null };
export type DrillRoute = { tab: "drill" } & DrillFilters;
export type PredictRoute = { tab: "predict" } & DrillFilters;
export type Route = ChainsRoute | BrowseRoute | DrillRoute | PredictRoute;

export const NO_FILTERS: DrillFilters = { cls: null, diff: null, pc: null };

export const DEFAULT_ROUTE: Route = { tab: "chains", chain: null };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [pathPart, queryPart = ""] = raw.split("?", 2);
  const segments = pathPart.split("/").filter((s) => s.length > 0).map((s) => safeDecode(s));
  const params = new URLSearchParams(queryPart);
  if (segments[0] === "browse") {
    return { tab: "browse", q: params.get("q") ?? "", cls: parseCls(params.get("cls")), pc: parsePc(params.get("pc")), open: params.get("open") ?? null };
  }
  if (segments[0] === "drill") return { tab: "drill", ...parseFilters(params) };
  if (segments[0] === "predict") return { tab: "predict", ...parseFilters(params) };
  if (segments[0] === "chains") return { tab: "chains", chain: segments[1] ?? null };
  return DEFAULT_ROUTE;
}

function parseCls(v: string | null): Classification | null {
  return v && (CLASSIFICATION_ORDER as readonly string[]).includes(v) ? (v as Classification) : null;
}

function parsePc(v: string | null): PhoneticChange | null {
  return v && (PHONETIC_CHANGE_ORDER as readonly string[]).includes(v) ? (v as PhoneticChange) : null;
}

function parseDiff(v: string | null): DifficultyLevel | null {
  return v === "1" || v === "2" || v === "3" || v === "4" ? (Number(v) as DifficultyLevel) : null;
}

function parseFilters(params: URLSearchParams): DrillFilters {
  return { cls: parseCls(params.get("cls")), diff: parseDiff(params.get("diff")), pc: parsePc(params.get("pc")) };
}

/** A stable key for a filter combination — the drill queue is rebuilt when it changes. */
export function filterKey(f: DrillFilters): string {
  return `${f.cls ?? ""}|${f.diff ?? ""}|${f.pc ?? ""}`;
}

export function toHash(route: Route): string {
  if (route.tab === "chains") return route.chain ? `#/chains/${encodeURIComponent(route.chain)}` : "#/chains";
  if (route.tab === "drill" || route.tab === "predict") {
    const params = new URLSearchParams();
    if (route.cls) params.set("cls", route.cls);
    if (route.diff) params.set("diff", String(route.diff));
    if (route.pc) params.set("pc", route.pc);
    const qs = params.toString();
    return qs ? `#/${route.tab}?${qs}` : `#/${route.tab}`;
  }
  const params = new URLSearchParams();
  if (route.q) params.set("q", route.q);
  if (route.cls) params.set("cls", route.cls);
  if (route.pc) params.set("pc", route.pc);
  if (route.open) params.set("open", route.open);
  const qs = params.toString();
  return qs ? `#/browse?${qs}` : "#/browse";
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function currentHash(): string {
  return window.location.hash;
}

export type Navigate = (route: Route, opts?: { replace?: boolean }) => void;

/** The current route, re-rendered on hashchange, plus a navigate function. An empty hash is rewritten to #/chains. */
export function useRoute(): [Route, Navigate] {
  const hash = useSyncExternalStore(subscribe, currentHash, () => "");
  const navigate = useCallback<Navigate>((route, opts) => {
    const next = toHash(route);
    if (next === window.location.hash) return;
    if (opts?.replace) {
      window.history.replaceState(null, "", next);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = next;
    }
  }, []);
  if (hash === "" && typeof window !== "undefined") {
    // No route yet: land on the chain list without adding a history entry.
    window.history.replaceState(null, "", toHash(DEFAULT_ROUTE));
  }
  return [parseHash(hash), navigate];
}
