import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-reload on chunk load failure (stale deploy cache)
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
