import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import portfolioRevision from "./prototype-vendor/revision.js";
import classicAssets from "./prototype-vendor/plugin.js";

// GitHub Pages serves the portfolio at the custom domain root (public/CNAME).
export default defineConfig({
  base: "/",
  plugins: [react(), classicAssets(), portfolioRevision()],
  server: { port: 5174, host: "127.0.0.1" },
});
