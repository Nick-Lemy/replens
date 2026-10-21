import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkoutSessionDraft } from "../sessions/api";

interface LiveSessionOptions {
  stream: MediaStream | null;
  trackingReady: boolean;
  positionReady: boolean;
  trackingError: string;
  countdownSeconds: number;
  userId: string | null;
  beginSet: () => void;
  endSet: () => number;
  stopCamera: () => void;
}

export function useLiveSession({
  stream,
  trackingReady,
  positionReady,
  trackingError,
  countdownSeconds,
  userId,
  beginSet,
  endSet,
  stopCamera,
}: LiveSessionOptions) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalReps, setFinalReps] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const [draft, setDraft] = useState<WorkoutSessionDraft | null>(null);
  const startedAt = useRef(0);
  const startedByUserId = useRef<string | null>(null);

  const finishSession = useCallback((wasInterrupted: boolean, stop = true) => {
    const startTime = startedAt.current;
    if (!startTime) {
      setRunning(false);
      setCountdown(null);
      if (stop) stopCamera();
      return;
    }
    const endTime = Date.now();
    const reps = endSet();
    setFinalReps(reps);
    setElapsed(Math.max(0, Math.floor((endTime - startTime) / 1000)));
    setRunning(false);
    setCountdown(null);
    setFinished(true);
    setInterrupted(wasInterrupted);
    setDraft({
      clientId: crypto.randomUUID(),
      counterVersion: "world-full-v2",
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
      completedReps: reps,
      interrupted: wasInterrupted,
      ownerUserId: startedByUserId.current,
    });
    startedAt.current = 0;
    if (stop) stopCamera();
  }, [endSet, stopCamera]);

  useEffect(() => {
    if (stream) return;
    setCountdown(null);
    if (running) finishSession(true, false);
    else setRunning(false);
  }, [stream, running, finishSession]);

  useEffect(() => {
    if (countdown === null || !stream) return;
    if (!trackingReady) {
      setCountdown(null);
      return;
    }
    if (countdown === 0) {
      if (!positionReady) return;
      const startTime = Date.now();
      startedAt.current = startTime;
      startedByUserId.current = userId;
      setElapsed(0);
      setFinalReps(0);
      setDraft(null);
      beginSet();
      setRunning(true);
      setCountdown(null);
      return;
    }
    const timer = window.setTimeout(() => setCountdown(countdown - 1), 1_000);
    return () => clearTimeout(timer);
  }, [countdown, stream, trackingReady, positionReady, beginSet, userId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1_000)),
      250,
    );
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && trackingError) finishSession(true);
  }, [running, trackingError, finishSession]);

  const startCountdown = useCallback(() => {
    setFinished(false);
    setInterrupted(false);
    setCountdown(countdownSeconds);
  }, [countdownSeconds]);

  const cancelCountdown = useCallback(() => setCountdown(null), []);

  const startCameraPreview = useCallback(() => {
    setFinished(false);
    setElapsed(0);
  }, []);

  const endSession = useCallback(() => finishSession(false), [finishSession]);

  return {
    countdown,
    running,
    elapsed,
    finished,
    finalReps,
    interrupted,
    draft,
    startCountdown,
    cancelCountdown,
    startCameraPreview,
    endSession,
  };
}
