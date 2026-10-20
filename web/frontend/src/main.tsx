import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ExerciseCatalogProvider } from "./features/exercises/ExerciseCatalogProvider";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ExerciseCatalogProvider><App /></ExerciseCatalogProvider>
    </AuthProvider>
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("RepLens offline support could not start:", error);
    });
  });
}
