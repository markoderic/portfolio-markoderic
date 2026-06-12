import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base stays "/" for dev; set to the repo path at deploy time.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, host: true },
});
