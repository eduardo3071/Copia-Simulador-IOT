import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  worker: { format: "es" },
  // one three.js for @react-three/fiber, the enclosure viewer and tscircuit's packages
  resolve: { dedupe: ["three"] },
  // pre-bundle deps that are first imported by the emulator and CAD workers, so starting
  // a simulation or opening the Gabinete tab never triggers a dev-server reload
  optimizeDeps: { include: ["avr8js", "replicad", "replicad-opencascadejs"] },
  build: { chunkSizeWarningLimit: 6000 },
});