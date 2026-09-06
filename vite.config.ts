import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The site is served under a GitHub project-pages path, so every asset URL
// must start with /compound-readings/.
export default defineConfig({
  base: "/compound-readings/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
  },
});
