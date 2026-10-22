import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearPrivateQueries } from "../api/queryClient";
import { beginGoogleSignIn, currentUser, endAccountSession, getAuthProviderAvailability, submitAccount, type AccountUser } from "./api";

type Status = "loading" | "guest" | "authenticated" | "unavailable";
interface AuthContextValue {
  user: AccountUser | null;
  status: Status;
  pending: boolean;
  error: string;
  googleAvailable: boolean;
  googlePending: boolean;
  providerLoadFailed: boolean;
  authenticateGoogle: (returnTo?: "current" | "confirm-delete") => Promise<boolean>;
  refresh: () => Promise<void>;
  authenticate: (mode: "signin" | "signup", details: { name?: string; email: string; password: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const sessionKey = ["auth", "session"] as const;
const AuthContext = createContext<AuthContextValue | null>(null);
const fallbackError = "Account services are unavailable. Please try again.";
const sessionOptions = queryOptions({
  queryKey: sessionKey,
  queryFn: ({ signal }) => currentUser(signal),
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});
const providerOptions = queryOptions({
  queryKey: ["auth", "providers"],
  queryFn: ({ signal }) => getAuthProviderAvailability(signal),
  staleTime: 60_000,
  retry: 1,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [googleNavigationPending, setGoogleNavigationPending] = useState(false);
  const googleNavigationRef = useRef(false);
  const previousUserId = useRef<string | null>(null);
  const session = useQuery(sessionOptions);
  const providers = useQuery(providerOptions);
  const authentication = useMutation({
    mutationFn: async ({ mode, details }: { mode: "signin" | "signup"; details: { name?: string; email: string; password: string } }) => {
      await queryClient.cancelQueries({ queryKey: sessionKey, exact: true });
      await submitAccount(mode, details);
      await queryClient.cancelQueries({ queryKey: sessionKey, exact: true });
      const restored = await queryClient.fetchQuery(sessionOptions);
      if (!restored) {
        throw new Error("Your account request succeeded, but a session could not be restored. Check that cookies are allowed and try signing in again.");
      }
      return restored;
    },
    gcTime: 0,
  });
  const signOutMutation = useMutation({
    mutationFn: endAccountSession,
    gcTime: 0,
  });
  const googleMutation = useMutation({ mutationFn: ({ callbackURL, errorCallbackURL }: { callbackURL: string; errorCallbackURL: string }) => beginGoogleSignIn(callbackURL, errorCallbackURL), gcTime: 0 });

  useEffect(() => {
    const restoreGoogleNavigation = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      googleNavigationRef.current = false;
      setGoogleNavigationPending(false);
      googleMutation.reset();
    };
    window.addEventListener("pageshow", restoreGoogleNavigation);
    return () => window.removeEventListener("pageshow", restoreGoogleNavigation);
  }, [googleMutation]);

  const cachedUser = session.data ?? null;
  const user = session.isError || signOutFailed ? null : cachedUser;
  const status: Status = session.isPending
    ? "loading"
    : session.isError || signOutFailed
      ? "unavailable"
      : user
        ? "authenticated"
        : "guest";
  const error = actionError || (session.isError ? session.error.message : "");
  const previousId = previousUserId.current;
  const currentId = status === "authenticated" ? user?.id ?? null : null;

  useEffect(() => {
    if (previousId && previousId !== currentId) clearPrivateQueries(previousId);
    previousUserId.current = currentId;
  }, [previousId, currentId]);

  const refresh = useCallback(async () => {
    try {
      await queryClient.cancelQueries({ queryKey: sessionKey, exact: true });
      await queryClient.fetchQuery(sessionOptions);
      setActionError("");
      setSignOutFailed(false);
    } catch {
      setActionError("");
    }
  }, [queryClient]);

  const authenticate: AuthContextValue["authenticate"] = async (mode, details) => {
    if (authentication.isPending || signOutMutation.isPending || googleNavigationRef.current) return false;
    setActionError("");
    setSignOutFailed(false);
    authentication.reset();
    try {
      await authentication.mutateAsync({ mode, details });
      setActionError("");
      return true;
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : fallbackError);
      return false;
    } finally {
      authentication.reset();
    }
  };

  const authenticateGoogle: AuthContextValue["authenticateGoogle"] = async (returnTo = "current") => {
    if (!providers.data?.socialProviders.includes("google") || googleMutation.isPending || authentication.isPending || signOutMutation.isPending || googleNavigationRef.current) return false;
    googleNavigationRef.current = true;
    setGoogleNavigationPending(true);
    setActionError("");
    const currentRoute = window.location.hash.slice(1).split(/[/?]/)[0];
    const safeRoute = ["home", "guide", "live", "history", "profile"].includes(currentRoute) ? currentRoute : "home";
    const callbackURL = new URL(window.location.pathname, window.location.origin);
    callbackURL.hash = returnTo === "confirm-delete" ? "profile?confirm-delete=1" : safeRoute;
    const errorURL = new URL(callbackURL.href);
    errorURL.hash = `${returnTo === "confirm-delete" ? "profile?" : safeRoute + "?"}google-auth-error=1`;
    try {
      const target = await googleMutation.mutateAsync({ callbackURL: callbackURL.href, errorCallbackURL: errorURL.href });
      window.location.assign(target);
      return true;
    } catch (failure) {
      googleNavigationRef.current = false;
      setGoogleNavigationPending(false);
      setActionError(failure instanceof Error ? failure.message : fallbackError);
      googleMutation.reset();
      return false;
    }
  };

  const signOut = async () => {
    if (authentication.isPending || signOutMutation.isPending || googleNavigationRef.current) return;
    signOutMutation.reset();
    const previous = user?.id;
    try {
      await queryClient.cancelQueries({ queryKey: sessionKey, exact: true });
      await signOutMutation.mutateAsync();
      await queryClient.cancelQueries({ queryKey: sessionKey, exact: true });
      queryClient.setQueryData(sessionKey, null);
      setActionError("");
      setSignOutFailed(false);
    } catch (failure) {
      await queryClient.cancelQueries({ queryKey: sessionKey, exact: true });
      queryClient.setQueryData(sessionKey, null);
      setActionError(failure instanceof Error ? failure.message : fallbackError);
      setSignOutFailed(true);
    } finally {
      if (previous) clearPrivateQueries(previous);
      signOutMutation.reset();
    }
  };

  const pending = authentication.isPending || signOutMutation.isPending || googleMutation.isPending || googleNavigationPending;
  return (
    <AuthContext.Provider value={{ user, status, pending, error, refresh, authenticate, signOut, googleAvailable: providers.data?.socialProviders.includes("google") ?? false, googlePending: googleMutation.isPending || googleNavigationPending, providerLoadFailed: providers.isError, authenticateGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth requires AuthProvider");
  return auth;
}
