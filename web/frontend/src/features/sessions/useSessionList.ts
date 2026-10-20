import { useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { privateQueryKey } from "../api/queryClient";
import { useAuth } from "../auth/AuthProvider";
import { listWorkoutSessions, WorkoutSessionError, type WorkoutSession } from "./api";

export function useSessionList(userId: string | null, limit: number) {
  const queryClient = useQueryClient();
  const { refresh: refreshAuth } = useAuth();
  const queryKey = userId ? privateQueryKey(userId, "sessions", limit) : ["private", "guest", "sessions", limit] as const;
  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam }) => {
      try {
        return await listWorkoutSessions(limit, pageParam, signal);
      } catch (failure) {
        if (failure instanceof WorkoutSessionError && failure.status === 401) void refreshAuth();
        throw failure;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
  });

  const remove = useCallback((id: string) => {
    if (!userId) return;
    queryClient.setQueryData(queryKey, (current: typeof query.data) => current && ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== id),
      })),
    }));
  }, [queryClient, query.data, queryKey, userId]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage]);

  const reload = useCallback(() => {
    if (userId) void query.refetch();
  }, [query.refetch, userId]);

  const items: WorkoutSession[] = query.data?.pages.flatMap((page) => page.items) ?? [];
  return {
    items: userId ? items : [],
    nextCursor: query.data?.pages.at(-1)?.nextCursor ?? null,
    loading: Boolean(userId) && query.isPending,
    loadingMore: query.isFetchingNextPage,
    error: query.error instanceof Error ? query.error.message : "",
    loadMore,
    reload,
    remove,
  };
}
