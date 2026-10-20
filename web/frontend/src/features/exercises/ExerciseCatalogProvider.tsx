import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ExerciseApiError, fetchExerciseCatalog } from "./api";
import type { ExerciseCatalog } from "./types";

interface ExerciseCatalogContextValue {
  catalog: ExerciseCatalog | null;
  loading: boolean;
  error: string;
  loadCatalog: (retry?: boolean) => Promise<void>;
}

const ExerciseCatalogContext = createContext<ExerciseCatalogContextValue | null>(null);

export function ExerciseCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<ExerciseCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const catalogRef = useRef<ExerciseCatalog | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const generation = useRef(0);

  const loadCatalog = useCallback(async (retry = false) => {
    if (!retry && catalogRef.current) return;
    if (!retry && requestRef.current && !controllerRef.current?.signal.aborted) return requestRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const version = ++generation.current;
    setLoading(true);
    setError("");
    const request = (async () => {
      try {
        const next = await fetchExerciseCatalog(controller.signal);
        if (controller.signal.aborted || version !== generation.current) return;
        catalogRef.current = next;
        setCatalog(next);
      } catch (failure) {
        if (controller.signal.aborted || version !== generation.current) return;
        setError(failure instanceof ExerciseApiError
          ? failure.message
          : "Exercise guides are unavailable. Check your connection and try again.");
      } finally {
        if (version === generation.current) {
          setLoading(false);
          requestRef.current = null;
          controllerRef.current = null;
        }
      }
    })();
    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => () => {
    generation.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
    requestRef.current = null;
  }, []);

  return (
    <ExerciseCatalogContext.Provider value={{ catalog, loading, error, loadCatalog }}>
      {children}
    </ExerciseCatalogContext.Provider>
  );
}

export function useExerciseCatalog() {
  const context = useContext(ExerciseCatalogContext);
  if (!context) throw new Error("useExerciseCatalog requires ExerciseCatalogProvider");
  return context;
}
