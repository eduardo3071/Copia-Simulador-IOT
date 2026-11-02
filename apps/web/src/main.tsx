import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@wokwi/elements";
import "./monaco.ts";
import "./styles.css";
import { App } from "./App.tsx";
import { api } from "./api.ts";
import { sim, useApp } from "./store.ts";

// dev-only handle for automated UI checks (stripped from production builds)
if (import.meta.env.DEV) Object.assign(window, { __simiot: { useApp, api, sim } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);