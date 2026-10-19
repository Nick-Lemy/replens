import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { currentUser, endAccountSession, submitAccount, type AccountUser } from "./api";

type Status = "loading" | "guest" | "authenticated" | "unavailable";
interface AuthContextValue {
  user: AccountUser | null;
  status: Status;
  pending: boolean;
  error: string;
  refresh: () => Promise<void>;
  authenticate: (mode: "signin" | "signup", details: { name?: string; email: string; password: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Account services are unavailable. Please try again.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const mutating = useRef(false);
  const mounted = useRef(false);
  const load = useCallback(async (version: number, requireSession = false) => {
    try {
      const result = await currentUser();
      if (!mounted.current || version !== generation.current) return false;
      setUser(result);
      setStatus(result ? "authenticated" : "guest");
      setError(!result && requireSession ? "Your account request succeeded, but a session could not be restored. Check that cookies are allowed and try signing in again." : "");
      return !!result;
    } catch (failure) {
      if (!mounted.current || version !== generation.current) return false;
      setUser(null);
      setStatus("unavailable");
      setError(errorMessage(failure));
      return false;
    }
  }, []);
  const refresh = useCallback(async () => {
    if (mutating.current) return;
    await load(++generation.current);
  }, [load]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", visible);
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      mounted.current = false;
      generation.current++;
      window.removeEventListener("focus", visible);
      window.removeEventListener("online", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  const authenticate: AuthContextValue["authenticate"] = async (mode, details) => {
    if (mutating.current) return false;
    mutating.current = true;
    const version = ++generation.current;
    setPending(true);
    setError("");
    try {
      await submitAccount(mode, details);
      return await load(version, true);
    } catch (failure) {
      if (mounted.current && version === generation.current) setError(errorMessage(failure));
      return false;
    } finally {
      mutating.current = false;
      if (mounted.current && version === generation.current) setPending(false);
    }
  };
  const signOut = async () => {
    if (mutating.current) return;
    mutating.current = true;
    const version = ++generation.current;
    setPending(true);
    setError("");
    try {
      await endAccountSession();
      if (mounted.current && version === generation.current) {
        setUser(null);
        setStatus("guest");
      }
    } catch (failure) {
      if (mounted.current && version === generation.current) {
        setUser(null);
        setStatus("unavailable");
        setError(errorMessage(failure));
      }
    } finally {
      mutating.current = false;
      if (mounted.current && version === generation.current) setPending(false);
    }
  };
  return <AuthContext.Provider value={{ user, status, pending, error, refresh, authenticate, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth requires AuthProvider");
  return auth;
}
