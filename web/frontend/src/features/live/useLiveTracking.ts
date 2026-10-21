import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  TwoArmCurlCounter,
  type CounterResult,
  type TrackingStatus,
} from "./curlCounter";
import { poseFrameFromMessage } from "./poseFrameAdapter";
import type { PoseWorkerMessage } from "./poseWorkerProtocol";
import { createVideoFramePump } from "./videoFramePump";
import { extractAngularSpeedFeatures } from "./angularSpeedFeatures";

export interface CompletedRepEvent {
  sessionId: number;
  sequence: number;
  endTimestampMs: number;
  startTimestampMs: number;
  topTimestampMs: number;
  rangeDegrees: number;
  meanUpSpeedDegS: number;
  peakUpSpeedDegS: number;
}

const emptyResult: CounterResult = {
  count: 0,
  status: "waiting",
  left: null,
  right: null,
  angles: null,
  reason: null,
  readyToStart: false,
  completedRep: null,
};

export function useLiveTracking(videoRef: RefObject<HTMLVideoElement | null>, stream: MediaStream | null) {
  const counterRef = useRef(new TwoArmCurlCounter());
  const countRef = useRef(0);
  const countingRef = useRef(false);
  const countingStartedAtRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CounterResult>(emptyResult);
  const [attempt, setAttempt] = useState(0);
  const [fps, setFps] = useState(0);
  const [runtimeVersion, setRuntimeVersion] = useState("");
  const fpsWindowRef = useRef({ startedAt: 0, frames: 0 });
  const sessionIdRef = useRef(0);
  const repSequenceRef = useRef(0);
  const [completedRep, setCompletedRep] = useState<CompletedRepEvent | null>(null);

  useEffect(() => {
    if (!stream) {
      sessionIdRef.current += 1;
      setCompletedRep(null);
      counterRef.current.reset();
      countingRef.current = false;
      setReady(false);
      setError("");
      setResult(emptyResult);
      setFps(0);
      setRuntimeVersion("");
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    if (typeof Worker === "undefined" || typeof createImageBitmap !== "function") {
      setReady(false);
      setError("Live tracking is not supported in this browser. You can still preview the camera.");
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL("./poseWorker.ts", import.meta.url), {
        type: "module",
        name: "replens-pose-tracking",
      });
    } catch {
      setReady(false);
      setError("Live tracking could not start in this browser. You can still preview the camera.");
      return;
    }
    let active = true;
    let initTimer = 0;
    let shutdownTimer = 0;
    const pump = createVideoFramePump(
      video,
      (bitmap, timestamp) => worker.postMessage({ type: "frame", bitmap, timestamp }, [bitmap]),
      (message) => fail(message),
    );

    setReady(false);
    setError("");
    setFps(0);
    setRuntimeVersion("");
    fpsWindowRef.current = { startedAt: 0, frames: 0 };

    const fail = (message: string) => {
      if (!active) return;
      active = false;
      setReady(false);
      setError(message);
      setCompletedRep(null);
      sessionIdRef.current += 1;
      countingRef.current = false;
      worker.terminate();
      pump.stop();
      clearTimeout(initTimer);
    };

    worker.onmessage = (event: MessageEvent<PoseWorkerMessage>) => {
      const message = event.data;
      if (message.type === "stopped") {
        clearTimeout(shutdownTimer);
        worker.terminate();
        return;
      }
      if (!active) return;
      if (message.type === "ready") {
        clearTimeout(initTimer);
        setRuntimeVersion(message.runtimeVersion);
        setReady(true);
        pump.start();
        return;
      }
      if (message.type === "error") {
        fail(message.message);
        return;
      }

      pump.frameProcessed();
      const frameWindow = fpsWindowRef.current;
      if (frameWindow.startedAt === 0) frameWindow.startedAt = message.timestamp;
      frameWindow.frames += 1;
      const measuredMs = message.timestamp - frameWindow.startedAt;
      if (measuredMs >= 1_000) {
        setFps((frameWindow.frames * 1_000) / measuredMs);
        fpsWindowRef.current = { startedAt: message.timestamp, frames: 0 };
      }
      // A worker may finish a preview frame after the user starts the set.
      // Do not let that pre-start pose mutate the freshly reset counter state.
      if (countingRef.current && message.timestamp < countingStartedAtRef.current) return;
      const frame = poseFrameFromMessage(message);
      const next = counterRef.current.update(frame, countingRef.current);
      countRef.current = next.count;
      if (next.status === "both-arms") setCompletedRep(null);
      if (next.completedRep) {
        const features = extractAngularSpeedFeatures(next.completedRep.samples);
        if (features) {
          repSequenceRef.current += 1;
          setCompletedRep({ ...features, endTimestampMs: next.completedRep.endTimestampMs, sessionId: sessionIdRef.current, sequence: repSequenceRef.current });
        } else {
          setCompletedRep(null);
        }
      }
      setResult(next);
    };
    worker.onerror = () => fail("Live tracking stopped unexpectedly. Turn the camera off and try again.");
    worker.onmessageerror = () => fail("Live tracking returned an unreadable frame. Turn the camera off and try again.");

    initTimer = window.setTimeout(() => {
      fail("Live tracking is taking too long to start. Check your connection and try again.");
    }, 45_000);
    worker.postMessage({ type: "initialize" });

    return () => {
      active = false;
      pump.stop();
      countingRef.current = false;
      clearTimeout(initTimer);
      clearTimeout(shutdownTimer);
      try {
        worker.postMessage({ type: "stop" });
        shutdownTimer = window.setTimeout(() => worker.terminate(), 1_000);
      } catch {
        worker.terminate();
      }
    };
  }, [attempt, stream, videoRef]);

  const beginSet = useCallback(() => {
    const startTimestamp = performance.now();
    sessionIdRef.current += 1;
    repSequenceRef.current = 0;
    setCompletedRep(null);
    counterRef.current.beginSet(startTimestamp);
    countRef.current = 0;
    countingStartedAtRef.current = startTimestamp;
    countingRef.current = true;
    setResult(emptyResult);
    setError("");
  }, []);

  const endSet = useCallback(() => {
    countingRef.current = false;
    setCompletedRep(null);
    sessionIdRef.current += 1;
    return countRef.current;
  }, []);

  const retry = useCallback(() => {
    if (stream) setAttempt((value) => value + 1);
  }, [stream]);

  const status = !stream
    ? "waiting"
    : error
      ? "waiting"
      : ready
        ? result.status
        : "waiting";

  return {
    ready,
    error,
    retry,
    status: status as TrackingStatus,
    reps: result.count,
    angles: result.angles,
    fps,
    runtimeVersion,
    reason: result.reason,
    readyToStart: result.readyToStart,
    completedRep,
    trackingSessionId: sessionIdRef.current,
    left: result.left,
    right: result.right,
    beginSet,
    endSet,
  };
}
