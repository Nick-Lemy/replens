import { useEffect, useRef, useState } from "react";
import type { AccountUser } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { createWorkoutSession, WorkoutSessionError, type WorkoutSessionDraft } from "./api";

export function SessionSaveControl({
  draft,
  user,
  accountLoading,
  openAccount,
}: {
  draft: WorkoutSessionDraft;
  user: AccountUser | null;
  accountLoading: boolean;
  openAccount: () => void;
}) {
  const [savedId, setSavedId] = useState("");
  const [savedForUserId, setSavedForUserId] = useState("");
  const [boundOwnerId, setBoundOwnerId] = useState(draft.ownerUserId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const activeUserIdRef = useRef(user?.id ?? null);
  const requestAbort = useRef<AbortController | null>(null);
  const activeUserId = user?.id ?? null;
  const ownerChanged = boundOwnerId !== null && activeUserId !== null && boundOwnerId !== activeUserId;
  const { refresh } = useAuth();
  activeUserIdRef.current = activeUserId;

  useEffect(() => {
    requestVersion.current++;
    requestAbort.current?.abort();
    requestAbort.current = null;
    setPending(false);
    setError("");
    setSavedId("");
    setSavedForUserId("");
    setBoundOwnerId(draft.ownerUserId);
  }, [draft.clientId]);

  useEffect(() => {
    requestVersion.current++;
    requestAbort.current?.abort();
    requestAbort.current = null;
    setPending(false);
    setError("");
  }, [activeUserId]);

  useEffect(() => () => requestAbort.current?.abort(), []);

  const save = async () => {
    if (!user || ownerChanged || pending || savedId) return;
    const userAtRequest = user.id;
    if (boundOwnerId === null) setBoundOwnerId(userAtRequest);
    const version = ++requestVersion.current;
    const controller = new AbortController();
    requestAbort.current = controller;
    setPending(true);
    setError("");
    try {
      const saved = await createWorkoutSession(draft, controller.signal);
      if (version !== requestVersion.current) return;
      if (userAtRequest !== activeUserIdRef.current) return;
      setSavedId(saved.id);
      setSavedForUserId(userAtRequest);
    } catch (failure) {
      if (version !== requestVersion.current) return;
      if (controller.signal.aborted) return;
      if (failure instanceof WorkoutSessionError && failure.status === 401) {
        setError("Your sign-in expired. Sign in again, then retry this save.");
        void refresh();
      } else {
        setError(failure instanceof Error ? failure.message : "Session could not be saved. Please try again.");
      }
    } finally {
      if (version === requestVersion.current) {
        setPending(false);
        requestAbort.current = null;
      }
    }
  };

  if (savedId) {
    return (
      <p className="mt-4 text-sm text-[#c6cbbd]" role="status">
        {savedForUserId === activeUserId ? "Session saved to your history." : "This summary was saved to the account used at the time."}
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {ownerChanged ? (
        <p className="text-xs leading-[1.7] text-muted" role="status">
          This session started under a different account and cannot be saved here.
        </p>
      ) : user ? (
        <button
          className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full border border-[#ffffff26] bg-[#ffffff03] disabled:opacity-50"
          disabled={pending || accountLoading}
          onClick={() => void save()}
        >
          {pending ? "Saving session…" : "Save session"}
        </button>
      ) : (
        <button
          className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full border border-[#ffffff26] bg-[#ffffff03] disabled:opacity-50"
          disabled={accountLoading}
          onClick={openAccount}
        >
          Sign in to save session
        </button>
      )}
      {error && <p className="text-xs leading-[1.7] text-accent" role="alert">{error}</p>}
    </div>
  );
}
