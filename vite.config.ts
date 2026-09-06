import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { countSourceEntries } from "./scripts/source-count";

// The site is served under a GitHub project-pages path, so every asset URL
// must start with /compound-readings/.
export default defineConfig({
  base: "/compound-readings/",
  plugins: [react(), tailwindcss()],
  define: {
    // Computed by reading the four source files at build time; never typed by hand.
    __SOURCE_ENTRY_COUNT__: JSON.stringify(countSourceEntries()),
  },
  test: {
    environment: "node",
  },
});
