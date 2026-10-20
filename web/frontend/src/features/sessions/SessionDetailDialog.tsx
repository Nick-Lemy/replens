import { useEffect, useRef, useState } from "react";
import { deleteWorkoutSession, getWorkoutSession, WorkoutSessionError, type WorkoutSession } from "./api";

function sessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SessionDetailDialog({
  id,
  userId,
  refreshAuth,
  onClose,
  onDeleted,
}: {
  id: string;
  userId: string;
  refreshAuth: () => Promise<void>;
  onClose: () => void;
  onDeleted: (id: string, userId: string) => void;
}) {
  const [detail, setDetail] = useState<WorkoutSession | null>(null);
  const [loadedOwnerId, setLoadedOwnerId] = useState("");
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ownerRef = useRef(userId);
  const generation = useRef(0);
  const deleteAbort = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  ownerRef.current = userId;
  const visibleDetail = loadedOwnerId === userId ? detail : null;
  const visibleError = loadedOwnerId === userId ? detailError : "";
  const visibleDeleteError = loadedOwnerId === userId ? deleteError : "";

  useEffect(() => {
    mounted.current = true;
    const version = ++generation.current;
    const controller = new AbortController();
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    setDetailLoading(true);
    setDetailError("");
    setLoadedOwnerId("");
    void getWorkoutSession(id, controller.signal)
      .then((item) => {
        if (controller.signal.aborted || version !== generation.current || ownerRef.current !== userId) return;
        setDetail(item);
        setLoadedOwnerId(userId);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted || version !== generation.current || ownerRef.current !== userId) return;
        setDetailError(failure instanceof Error ? failure.message : "Session details are unavailable.");
        setLoadedOwnerId(userId);
        if (failure instanceof WorkoutSessionError && failure.status === 401) void refreshAuth();
      })
      .finally(() => {
        if (mounted.current && version === generation.current && ownerRef.current === userId) setDetailLoading(false);
      });
    return () => {
      mounted.current = false;
      controller.abort();
      deleteAbort.current?.abort();
      generation.current++;
    };
  }, [id, userId, refreshAuth, retryCount]);

  const close = () => {
    if (!deletePending) onClose();
  };

  const confirmDeletion = async () => {
    if (!visibleDetail || deletePending || ownerRef.current !== userId) return;
    const requestGeneration = generation.current;
    const controller = new AbortController();
    deleteAbort.current = controller;
    setDeletePending(true);
    setDeleteError("");
    try {
      await deleteWorkoutSession(id, controller.signal);
      if (controller.signal.aborted || !mounted.current || requestGeneration !== generation.current || ownerRef.current !== userId) return;
      onDeleted(id, userId);
    } catch (failure) {
      if (controller.signal.aborted || !mounted.current || requestGeneration !== generation.current || ownerRef.current !== userId) return;
      if (failure instanceof WorkoutSessionError && failure.status === 401) {
        setDeleteError("Your sign-in expired. Sign in again to manage saved sessions.");
        void refreshAuth();
      } else {
        setDeleteError(failure instanceof Error ? failure.message : "This session could not be deleted. Please try again.");
      }
    } finally {
      if (mounted.current && requestGeneration === generation.current && ownerRef.current === userId) {
        setDeletePending(false);
        deleteAbort.current = null;
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto p-6 bg-[#1b1f18] text-foreground border border-[#ffffff1c] rounded-3xl w-[min(440px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_32px)] overflow-y-auto backdrop:bg-[#000b] backdrop:backdrop-blur-[6px]"
      aria-labelledby="session-detail-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClose={close}
    >
      <h2 id="session-detail-title" className="text-[26px] leading-tight tracking-[-0.04em] font-medium">Session details</h2>
      {(detailLoading || loadedOwnerId !== userId) && <p className="text-sm text-muted mt-5" role="status">Loading session…</p>}
      {visibleError && (
        <div className="mt-5">
          <p className="text-sm text-accent" role="alert">{visibleError}</p>
          <button className="min-h-11 mt-2 text-xs text-accent underline-offset-4 hover:underline" onClick={() => setRetryCount((value) => value + 1)}>Retry</button>
        </div>
      )}
      {visibleDetail && (
        <>
          <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div><dt className="text-xs text-muted">Started</dt><dd className="mt-1">{sessionDate(visibleDetail.startedAt)}</dd></div>
            <div><dt className="text-xs text-muted">Duration</dt><dd className="mt-1">{duration(visibleDetail.durationSeconds)}</dd></div>
            <div><dt className="text-xs text-muted">Completed curls</dt><dd className="mt-1">{visibleDetail.completedReps}</dd></div>
            <div><dt className="text-xs text-muted">Session status</dt><dd className="mt-1">{visibleDetail.interrupted ? "Interrupted" : "Ended normally"}</dd></div>
          </dl>
          <p className="text-xs text-muted leading-[1.7] mt-5">This is a saved live counting summary. It contains no video, pose landmarks or reps-left estimate.</p>
          {!confirmDelete ? (
            <button className="min-h-11 mt-5 text-xs text-[#d7a4a0] underline underline-offset-4" onClick={() => setConfirmDelete(true)}>Delete session</button>
          ) : (
            <div className="mt-5 p-4 rounded-xl border border-[#ffffff17]">
              <p className="text-sm">Delete this saved summary from your history?</p>
              <p className="text-xs text-muted leading-[1.7] mt-2">This action cannot be undone.</p>
              {visibleDeleteError && <p className="mt-3 text-xs text-accent" role="alert">{visibleDeleteError}</p>}
              <button className="flex items-center justify-center min-h-12 rounded-xl py-3 px-4 text-xs font-semibold w-full bg-[#733e39] text-white mt-4 disabled:opacity-60" disabled={deletePending} onClick={() => void confirmDeletion()}>
                {deletePending ? "Deleting…" : "Confirm delete"}
              </button>
              <button className="min-h-11 mt-2 text-xs text-muted underline underline-offset-4" disabled={deletePending} onClick={() => { setConfirmDelete(false); setDeleteError(""); }}>Cancel</button>
            </div>
          )}
        </>
      )}
      <button className="flex items-center justify-center min-h-11 rounded-xl px-5 text-xs border border-[#ffffff26] w-full mt-5" disabled={deletePending} onClick={close}>Close</button>
    </dialog>
  );
}
