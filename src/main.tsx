import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialize Sentry before rendering (no-op when VITE_SENTRY_DSN is not set)
initSentry();

// Auto-reload on chunk load failure (stale deploy cache)
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
