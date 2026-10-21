const MAX_FRAME_EDGE = 640;
const FRAME_RESPONSE_TIMEOUT_MS = 10_000;
const FRAME_STALL_TIMEOUT_MS = 5_000;

async function captureTrackingBitmap(video: HTMLVideoElement): Promise<ImageBitmap> {
  const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  try {
    return await createImageBitmap(video, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
  } catch {
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not resize the camera frame.");
    context.drawImage(video, 0, 0, width, height);
    return createImageBitmap(canvas);
  }
}

export interface VideoFramePump {
  start(): void;
  frameProcessed(): void;
  stop(): void;
}

export function createVideoFramePump(
  video: HTMLVideoElement,
  sendFrame: (bitmap: ImageBitmap, timestamp: number) => void,
  onFailure: (message: string) => void,
): VideoFramePump {
  let active = false;
  let inFlight = false;
  let lastTimestamp = 0;
  let failedFrames = 0;
  let frameTimer = 0;
  let fallbackTimer = 0;
  let watchdogTimer = 0;
  let callbackId = 0;
  let generation = 0;
  let lastFrameAt = 0;
  let lastVideoTime = -1;

  const stop = () => {
    active = false;
    clearTimeout(frameTimer);
    clearTimeout(fallbackTimer);
    clearInterval(watchdogTimer);
    if (callbackId && "cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(callbackId);
    callbackId = 0;
    generation += 1;
  };

  const fail = (message: string) => {
    if (!active) return;
    stop();
    onFailure(message);
  };

  const scheduleNext = () => {
    if (!active || inFlight) return;
    if ("requestVideoFrameCallback" in video) {
      callbackId = video.requestVideoFrameCallback((now) => {
        callbackId = 0;
        lastFrameAt = performance.now();
        void captureFrame(now);
      });
    } else {
      const fallbackVideo = video as HTMLVideoElement;
      fallbackTimer = window.setTimeout(() => {
        fallbackTimer = 0;
        if (fallbackVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          fallbackVideo.videoWidth > 0 && fallbackVideo.videoHeight > 0 && fallbackVideo.currentTime !== lastVideoTime) {
          lastVideoTime = fallbackVideo.currentTime;
          lastFrameAt = performance.now();
          void captureFrame(performance.now());
        } else {
          scheduleNext();
        }
      }, 100);
    }
  };

  const captureFrame = async (now: number) => {
    if (!active || inFlight) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
      scheduleNext();
      return;
    }
    inFlight = true;
    const captureGeneration = ++generation;
    frameTimer = window.setTimeout(() => {
      fail("Live tracking stopped responding. Turn the camera off and try again.");
    }, FRAME_RESPONSE_TIMEOUT_MS);
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await captureTrackingBitmap(video);
      if (!active || captureGeneration !== generation) {
        bitmap.close();
        inFlight = false;
        return;
      }
      lastTimestamp = Math.max(Math.round(now), lastTimestamp + 1);
      sendFrame(bitmap, lastTimestamp);
      bitmap = null;
    } catch {
      bitmap?.close();
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

  return {
    start() {
      if (active) return;
      active = true;
      lastFrameAt = performance.now();
      watchdogTimer = window.setInterval(() => {
        if (active && performance.now() - lastFrameAt > FRAME_STALL_TIMEOUT_MS) {
          fail("Live camera frames stopped arriving. Turn the camera off and try again.");
        }
      }, 1_000);
      scheduleNext();
    },
    frameProcessed() {
      if (!active) return;
      clearTimeout(frameTimer);
      inFlight = false;
      failedFrames = 0;
      scheduleNext();
    },
    stop,
  };
}
