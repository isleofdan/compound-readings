import { Browse } from "./modes/Browse";
import { ChainExplorer } from "./modes/ChainExplorer";
import { useRoute } from "./router";
import { TabBar } from "./ui/TabBar";

// App shell (BUILD_PLAN.md 1.5): a hash-routed content area above a fixed
// bottom tab bar. State lives in the URL and in memory only — no localStorage,
// nothing leaves the device (Phase 2 owns persistence, keyed by user).

export default function App() {
  const [route, navigate] = useRoute();
  return (
    <>
      <main className="mx-auto max-w-md pb-40">
        {route.tab === "browse" ? <Browse route={route} navigate={navigate} /> : <ChainExplorer route={route} navigate={navigate} />}
      </main>
      <TabBar active={route.tab} onSelect={(r) => navigate(r)} />
    </>
  );
}
