import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchExerciseCatalog } from "./api";
import type { ExerciseCatalog } from "./types";

const catalogKey = ["public", "exercise-catalog"] as const;

export function useExerciseCatalog(enabled = true): {
  catalog: ExerciseCatalog | null;
  loading: boolean;
  error: string;
  loadCatalog: (retry?: boolean) => Promise<void>;
} {
  const query = useQuery({
    queryKey: catalogKey,
    queryFn: ({ signal }) => fetchExerciseCatalog(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
  const loadCatalog = useCallback(async (retry = false) => {
    if (retry || query.isError) await query.refetch();
  }, [query.isError, query.refetch]);

  return {
    catalog: query.data ?? null,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : "",
    loadCatalog,
  };
}
