// Hash routing (Session 3 brief §5 rule 6): every screen is addressable by URL
// and a reload lands on the same screen. Routes:
//   #/chains            the chain list
//   #/chains/手         one chain
//   #/browse            Browse (the Session 2 inspection page)
//   #/browse?q=場&cls=yutou&pc=rendaku&open=cr_0027
// Only the URL is stored; in-memory state (which cards are revealed) is not.
import { useCallback, useSyncExternalStore } from "react";
import { CLASSIFICATION_ORDER, PHONETIC_CHANGE_ORDER } from "./data/labels";
import type { Classification, PhoneticChange } from "./data/schema";

export type ChainsRoute = { tab: "chains"; chain: string | null };
export type BrowseRoute = { tab: "browse"; q: string; cls: Classification | null; pc: PhoneticChange | null; open: string | null };
export type Route = ChainsRoute | BrowseRoute;

export const DEFAULT_ROUTE: Route = { tab: "chains", chain: null };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [pathPart, queryPart = ""] = raw.split("?", 2);
  const segments = pathPart.split("/").filter((s) => s.length > 0).map((s) => safeDecode(s));
  const params = new URLSearchParams(queryPart);
  if (segments[0] === "browse") {
    const cls = params.get("cls");
    const pc = params.get("pc");
    return {
      tab: "browse",
      q: params.get("q") ?? "",
      cls: cls && (CLASSIFICATION_ORDER as readonly string[]).includes(cls) ? (cls as Classification) : null,
      pc: pc && (PHONETIC_CHANGE_ORDER as readonly string[]).includes(pc) ? (pc as PhoneticChange) : null,
      open: params.get("open") ?? null,
    };
  }
  if (segments[0] === "chains") return { tab: "chains", chain: segments[1] ?? null };
  return DEFAULT_ROUTE;
}

export function toHash(route: Route): string {
  if (route.tab === "chains") return route.chain ? `#/chains/${encodeURIComponent(route.chain)}` : "#/chains";
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
