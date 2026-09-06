import { useState } from "react";
import { Browse } from "./modes/Browse";
import { ChainExplorer, EMPTY_REVEAL_STATE, type RevealState } from "./modes/ChainExplorer";
import { ClassificationDrill } from "./modes/ClassificationDrill";
import { PredictionChallenge } from "./modes/PredictionChallenge";
import { useRoute } from "./router";
import { TabBar } from "./ui/TabBar";

// App shell (BUILD_PLAN.md 1.5): a hash-routed content area above a fixed
// bottom tab bar. State lives in the URL and in memory only — no localStorage,
// nothing leaves the device (Phase 2 owns persistence, keyed by user). The
// reveal state is held here so it survives switching tabs within a session.

export default function App() {
  const [route, navigate] = useRoute();
  const [reveal, setReveal] = useState<RevealState>(EMPTY_REVEAL_STATE);
  return (
    <>
      <main className="mx-auto max-w-md pb-40">
        {route.tab === "browse" ? (
          <Browse route={route} navigate={navigate} />
        ) : route.tab === "drill" ? (
          <ClassificationDrill route={route} navigate={navigate} />
        ) : route.tab === "predict" ? (
          <PredictionChallenge route={route} navigate={navigate} />
        ) : (
          <ChainExplorer route={route} navigate={navigate} state={reveal} setState={setReveal} />
        )}
      </main>
      <TabBar active={route.tab} onSelect={(r) => navigate(r)} />
    </>
  );
}
