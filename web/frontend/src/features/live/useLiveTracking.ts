import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  TwoArmCurlCounter,
  type CounterResult,
  type PoseFrame,
  type PoseLandmark,
  type WorldArmLandmarks,
  type WorldLandmark,
  type TrackingStatus,
} from "./curlCounter";

type WorkerMessage =
  | { type: "ready"; runtimeVersion: string }
  | {
      type: "frame";
      timestamp: number;
      width: number;
      height: number;
      landmarks: PoseLandmark[] | null;
      worldLandmarks: WorldLandmark[] | null;
    }
  | { type: "error"; message: string }
  | { type: "stopped" };

function armsFrom(landmarks: PoseLandmark[] | null, indexes: [number, number, number]) {
  if (!landmarks) return null;
  const [shoulder, elbow, wrist] = indexes.map((index) => landmarks[index]);
  if (!shoulder || !elbow || !wrist) return null;
  return { shoulder, elbow, wrist };
}

function worldArmsFrom(landmarks: WorldLandmark[] | null, indexes: [number, number, number]): WorldArmLandmarks | null {
  if (!landmarks) return null;
  const [shoulder, elbow, wrist] = indexes.map((index) => landmarks[index]);
  if (!shoulder || !elbow || !wrist) return null;
  return { shoulder, elbow, wrist };
}

const emptyResult: CounterResult = {
  count: 0,
  status: "waiting",
  left: null,
  right: null,
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

  useEffect(() => {
    if (!stream) {
      setReady(false);
      setError("");
      setResult(emptyResult);
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
    let workerReady = false;
    let inFlight = false;
    let lastTimestamp = 0;
    let failedFrames = 0;
    let frameTimer = 0;
    let initTimer = 0;
    let shutdownTimer = 0;
    let callbackId = 0;
    let fallbackTimer = 0;
    let captureGeneration = 0;

    setReady(false);
    setError("");

    const stopFrameLoop = () => {
      active = false;
      clearTimeout(frameTimer);
      clearTimeout(initTimer);
      clearTimeout(fallbackTimer);
      if (callbackId && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(callbackId);
      }
      callbackId = 0;
      captureGeneration += 1;
    };

    const fail = (message: string) => {
      if (!active) return;
      setReady(false);
      setError(message);
      countingRef.current = false;
      worker.terminate();
      stopFrameLoop();
    };

    const scheduleNext = () => {
      if (!active || !workerReady || inFlight) return;
      if ("requestVideoFrameCallback" in video) {
        callbackId = video.requestVideoFrameCallback((now) => {
          callbackId = 0;
          void captureFrame(now);
        });
      } else {
        fallbackTimer = window.setTimeout(() => {
          fallbackTimer = 0;
          void captureFrame(performance.now());
        }, 100);
      }
    };

    const captureFrame = async (now: number) => {
      if (!active || !workerReady || inFlight) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
        scheduleNext();
        return;
      }
      inFlight = true;
      const captureId = ++captureGeneration;
      try {
        frameTimer = window.setTimeout(() => {
          fail("Live tracking stopped responding. Turn the camera off and try again.");
        }, 10_000);
        const bitmap = await createImageBitmap(video);
        if (!active || captureId !== captureGeneration) {
          bitmap.close();
          clearTimeout(frameTimer);
          inFlight = false;
          return;
        }
        lastTimestamp = Math.max(Math.round(now), lastTimestamp + 1);
        worker.postMessage({ type: "frame", bitmap, timestamp: lastTimestamp }, [bitmap]);
      } catch {
        clearTimeout(frameTimer);
        inFlight = false;
        failedFrames += 1;
        if (failedFrames >= 3) {
          fail("Live camera frames could not be processed. Check the camera and try again.");
        } else {
          scheduleNext();
        }
      }
    };

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "stopped") {
        clearTimeout(shutdownTimer);
        worker.terminate();
        return;
      }
      if (!active) return;
      if (message.type === "ready") {
        clearTimeout(initTimer);
        workerReady = true;
        setReady(true);
        scheduleNext();
        return;
      }
      if (message.type === "error") {
        fail(message.message);
        return;
      }

      clearTimeout(frameTimer);
      inFlight = false;
      failedFrames = 0;
      const frame: PoseFrame = {
        timestamp: message.timestamp,
        width: message.width,
        height: message.height,
        left: armsFrom(message.landmarks, [11, 13, 15]),
        right: armsFrom(message.landmarks, [12, 14, 16]),
        worldLeft: worldArmsFrom(message.worldLandmarks, [11, 13, 15]),
        worldRight: worldArmsFrom(message.worldLandmarks, [12, 14, 16]),
      };
      if (countingRef.current && message.timestamp >= countingStartedAtRef.current) {
        const next = counterRef.current.update(frame, true);
        countRef.current = next.count;
        setResult(next);
      } else {
        const bothVisible = frame.left && frame.right &&
          [frame.left, frame.right].every((arm) =>
            [arm.shoulder, arm.elbow, arm.wrist].every((point) => point.visibility >= 0.6),
          );
        setResult({
          count: countRef.current,
          status: bothVisible ? "tracking" : "both-arms",
          left: frame.left,
          right: frame.right,
        });
      }
      scheduleNext();
    };
    worker.onerror = () => fail("Live tracking stopped unexpectedly. Turn the camera off and try again.");
    worker.onmessageerror = () => fail("Live tracking returned an unreadable frame. Turn the camera off and try again.");

    initTimer = window.setTimeout(() => {
      fail("Live tracking is taking too long to start. Check your connection and try again.");
    }, 45_000);
    worker.postMessage({ type: "initialize" });

    return () => {
      stopFrameLoop();
      workerReady = false;
      countingRef.current = false;
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
    counterRef.current.reset();
    countRef.current = 0;
    countingStartedAtRef.current = performance.now();
    countingRef.current = true;
    setResult(emptyResult);
    setError("");
  }, []);

  const endSet = useCallback(() => {
    countingRef.current = false;
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
    left: result.left,
    right: result.right,
    beginSet,
    endSet,
  };
}
