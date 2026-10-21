import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseWorkerMessage, PoseWorkerRequest } from "./poseWorkerProtocol";

interface TrackingConfig {
  runtimeVersion: string;
  modelUrl: string;
  wasmRoot: string;
  exerciseId: "two-arm-dumbbell-curl";
}

interface WorkerScope {
  location: Location;
  onmessage: ((event: MessageEvent<PoseWorkerRequest>) => void) | null;
  postMessage(message: PoseWorkerMessage): void;
}

const scope = self as unknown as WorkerScope;
const MODEL_ASSET_PREFIX = "/api/tracking/assets/tasks-vision-1.1.1-pose-full-float16-1/";
let landmarker: PoseLandmarker | null = null;
let stopped = false;
let initializing = false;
let fetchPolicyInstalled = false;

function installFetchPolicy(): void {
  if (fetchPolicyInstalled) return;
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.href
        : String(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    let url: URL;
    try {
      url = new URL(requestUrl, scope.location.origin);
    } catch {
      return Promise.reject(new TypeError("Tracking worker blocked an unsupported request."));
    }
    const allowedPath =
      url.pathname === "/api/tracking/config" ||
      url.pathname.startsWith(MODEL_ASSET_PREFIX);
    if (
      method !== "GET" ||
      url.origin !== scope.location.origin ||
      url.search !== "" ||
      url.hash !== "" ||
      !allowedPath
    ) {
      return Promise.reject(new TypeError("Tracking worker blocked an unsupported request."));
    }
    return nativeFetch(input, init);
  };
  fetchPolicyInstalled = true;
}

function assetUrl(path: string): string {
  const url = new URL(path, scope.location.origin);
  if (
    url.origin !== scope.location.origin ||
    !url.pathname.startsWith(MODEL_ASSET_PREFIX) ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("Invalid tracking asset path");
  }
  return url.href;
}

async function initialize(): Promise<void> {
  if (landmarker || initializing || stopped) return;
  initializing = true;
  try {
    installFetchPolicy();
    const { FilesetResolver, PoseLandmarker: PoseLandmarkerTask } =
      await import("@mediapipe/tasks-vision");
    const response = await fetch("/api/tracking/config", {
      credentials: "include",
      cache: "no-store",
    });
    if (response.status === 503) throw new Error("unavailable");
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) {
      throw new Error("config");
    }
    const config = await response.json() as TrackingConfig;
    if (
      config.runtimeVersion !== "1.1.1" ||
      config.exerciseId !== "two-arm-dumbbell-curl" ||
      typeof config.modelUrl !== "string" ||
      typeof config.wasmRoot !== "string"
    ) throw new Error("config");

    const wasmRoot = new URL(assetUrl(config.wasmRoot));
    wasmRoot.pathname = wasmRoot.pathname.replace(/\/+$/, "");
    const vision = await FilesetResolver.forVisionTasks(wasmRoot.href, true);
    if (stopped) return;
    const next = await PoseLandmarkerTask.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: assetUrl(config.modelUrl),
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
      outputSegmentationMasks: false,
    });
    if (stopped) {
      next.close();
      return;
    }
    landmarker = next;
    scope.postMessage({ type: "ready", runtimeVersion: config.runtimeVersion });
  } catch (failure) {
    if (!stopped) {
      scope.postMessage({
        type: "error",
        message: failure instanceof Error && failure.message === "unavailable"
          ? "Live tracking is not available yet. Try again later."
          : "Live tracking could not start. Check your connection and try again.",
      });
    }
  } finally {
    initializing = false;
  }
}

function stop(): void {
  stopped = true;
  landmarker?.close();
  landmarker = null;
  scope.postMessage({ type: "stopped" });
}

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === "initialize") {
    void initialize();
    return;
  }
  if (message.type === "stop") {
    stop();
    return;
  }
  if (message.type !== "frame") return;

  const { bitmap, timestamp } = message;
  try {
    if (stopped || !landmarker) return;
    const result = landmarker.detectForVideo(bitmap, timestamp);
    scope.postMessage({
      type: "frame",
      timestamp,
      width: bitmap.width,
      height: bitmap.height,
      landmarks: result.landmarks[0] ?? null,
      worldLandmarks: result.worldLandmarks[0] ?? null,
    });
  } catch {
    scope.postMessage({
      type: "error",
      message: "Live tracking stopped responding. Turn the camera off and try again.",
    });
  } finally {
    bitmap.close();
  }
};
