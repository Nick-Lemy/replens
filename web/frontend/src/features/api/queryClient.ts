import { focusManager, QueryClient } from "@tanstack/react-query";

focusManager.setEventListener((onFocus) => {
  const handleVisibleFocus = () => {
    if (document.visibilityState === "visible") onFocus();
  };
  window.addEventListener("focus", handleVisibleFocus, false);
  document.addEventListener("visibilitychange", handleVisibleFocus, false);
  return () => {
    window.removeEventListener("focus", handleVisibleFocus);
    document.removeEventListener("visibilitychange", handleVisibleFocus);
  };
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      retry: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: "always",
      retry: false,
      gcTime: 0,
    },
  },
});

export const privateQueryKey = (userId: string, ...parts: readonly unknown[]) =>
  ["private", userId, ...parts] as const;

export function clearPrivateQueries(userId: string) {
  const queryKey = ["private", userId] as const;
  void queryClient.cancelQueries({ queryKey }).finally(() => {
    queryClient.removeQueries({ queryKey });
  });
}

export function hasCurrentSessionOwner(userId: string) {
  const sessionKey = ["auth", "session"] as const;
  const session = queryClient.getQueryData<{ id: string } | null>(sessionKey);
  return queryClient.getQueryState(sessionKey)?.status === "success" && session?.id === userId;
}
