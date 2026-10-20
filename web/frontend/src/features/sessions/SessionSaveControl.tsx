import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccountUser } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { hasCurrentSessionOwner, privateQueryKey } from "../api/queryClient";
import { ApiError } from "../api/client";
import { createWorkoutSession, type WorkoutSessionDraft } from "./api";

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
  const [error, setError] = useState("");
  const draftRef = useRef(draft);
  const activeUserIdRef = useRef(user?.id ?? null);
  const requestAbort = useRef<AbortController | null>(null);
  const activeUserId = user?.id ?? null;
  const ownerChanged = boundOwnerId !== null && activeUserId !== null && boundOwnerId !== activeUserId;
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ sessionDraft, signal }: { ownerId: string; sessionDraft: WorkoutSessionDraft; signal: AbortSignal }) =>
      createWorkoutSession(sessionDraft, signal),
    onSuccess: (saved, variables) => {
      if (
        variables.signal.aborted ||
        draftRef.current.clientId !== variables.sessionDraft.clientId ||
        activeUserIdRef.current !== variables.ownerId ||
        !hasCurrentSessionOwner(variables.ownerId)
      ) return;
      setSavedId(saved.id);
      setSavedForUserId(variables.ownerId);
      void queryClient.invalidateQueries({ queryKey: privateQueryKey(variables.ownerId, "sessions") });
    },
  });
  const pending = mutation.isPending;
  draftRef.current = draft;
  activeUserIdRef.current = activeUserId;

  useEffect(() => {
    requestAbort.current?.abort();
    requestAbort.current = null;
    setError("");
    setSavedId("");
    setSavedForUserId("");
    setBoundOwnerId(draft.ownerUserId);
    mutation.reset();
  }, [draft.clientId]);

  useEffect(() => {
    requestAbort.current?.abort();
    requestAbort.current = null;
    setError("");
    mutation.reset();
  }, [activeUserId]);

  useEffect(() => () => requestAbort.current?.abort(), []);

  const save = async () => {
    if (!user || ownerChanged || pending || savedId) return;
    const userAtRequest = user.id;
    if (boundOwnerId === null) setBoundOwnerId(userAtRequest);
    mutation.reset();
    const controller = new AbortController();
    requestAbort.current = controller;
    setError("");
    try {
      await mutation.mutateAsync({ ownerId: userAtRequest, sessionDraft: draft, signal: controller.signal });
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) {
        setError(failure.message);
        void refresh();
      } else {
        setError(failure instanceof Error ? failure.message : "Session could not be saved. Please try again.");
      }
    } finally {
      if (requestAbort.current === controller) requestAbort.current = null;
      mutation.reset();
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
