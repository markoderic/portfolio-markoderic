import { defineConfig } from "vite";
import privateRevision from "./prototype-vendor/revision.js";
import react from "@vitejs/plugin-react";
import classicPrivateAssets from "./prototype-vendor/plugin.js";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react(), classicPrivateAssets(), privateRevision()],
  server: { host: "127.0.0.1", port: 5175, strictPort: true },
  // A private output under the existing ignored Vite directory, outside the deployment artifact.
  build: {
    outDir: ".vite/prototype-build",
    rollupOptions: {
      input: fileURLToPath(new URL("./prototype.html", import.meta.url)),
    },
  },
});
