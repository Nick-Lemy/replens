import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { listWorkoutSessions, WorkoutSessionError, type WorkoutSession } from "./api";

export function useSessionList(userId: string | null, limit: number) {
  const { refresh: refreshAuth } = useAuth();
  const [items, setItems] = useState<WorkoutSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const generation = useRef(0);
  const currentUserId = useRef(userId);
  const loadMoreAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    currentUserId.current = userId;
    const version = ++generation.current;
    const controller = new AbortController();
    loadMoreAbort.current?.abort();
    loadMoreAbort.current = null;
    setItems([]);
    setNextCursor(null);
    setError("");
    setLoadedForUserId(null);
    setLoadingMore(false);
    if (!userId) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoadedForUserId(userId);
    setLoading(true);
    void listWorkoutSessions(limit, undefined, controller.signal)
      .then((page) => {
        if (controller.signal.aborted || version !== generation.current || currentUserId.current !== userId) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setLoadedForUserId(userId);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted || version !== generation.current || currentUserId.current !== userId) return;
        setError(failure instanceof Error ? failure.message : "Session history is unavailable right now.");
        if (failure instanceof WorkoutSessionError && failure.status === 401) void refreshAuth();
      })
      .finally(() => {
        if (version === generation.current) setLoading(false);
      });
    return () => {
      controller.abort();
      loadMoreAbort.current?.abort();
      loadMoreAbort.current = null;
      generation.current++;
    };
  }, [userId, limit, reloadToken, refreshAuth]);

  const loadMore = useCallback(async () => {
    if (!userId || !nextCursor || loadingMore || loadMoreAbort.current || loadedForUserId !== userId) return;
    const version = generation.current;
    const controller = new AbortController();
    loadMoreAbort.current = controller;
    setLoadingMore(true);
    setError("");
    try {
      const page = await listWorkoutSessions(limit, nextCursor, controller.signal);
      if (version !== generation.current || currentUserId.current !== userId || controller.signal.aborted) return;
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (failure) {
      if (version !== generation.current || currentUserId.current !== userId || controller.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : "More sessions could not be loaded.");
      if (failure instanceof WorkoutSessionError && failure.status === 401) void refreshAuth();
    } finally {
      if (version === generation.current) {
        setLoadingMore(false);
        if (loadMoreAbort.current === controller) loadMoreAbort.current = null;
      }
    }
  }, [userId, nextCursor, loadingMore, loadedForUserId, limit, refreshAuth]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);
  const remove = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const visible = loadedForUserId === userId ? items : [];
  const visibleError = loadedForUserId === userId || loading ? error : "";

  return {
    items: visible,
    nextCursor: loadedForUserId === userId ? nextCursor : null,
    loading,
    loadingMore,
    error: visibleError,
    loadMore,
    reload,
    remove,
  };
}
