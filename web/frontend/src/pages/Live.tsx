import { useEffect, useRef, useState } from "react";
import { useCamera, type Facing } from "../hooks/useCamera";
import { Icon } from "../components/Icon";
import { useLiveTracking } from "../features/live/useLiveTracking";
import { PoseOverlay } from "../features/live/PoseOverlay";
import { useAuth } from "../features/auth/AuthProvider";
import { useLiveSession } from "../features/live/useLiveSession";
import { LiveMetrics, SessionSummary, TrackingDiagnostics, trackingLabel } from "../features/live/LivePanels";

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function Live({
  initialFacing,
  countdownSeconds,
  openAccount,
}: {
  initialFacing: Facing;
  countdownSeconds: number;
  openAccount: () => void;
}) {
  const { stream, busy, error, start, stop } = useCamera();
  const { user, status: accountStatus } = useAuth();
  const video = useRef<HTMLVideoElement>(null);
  const tracking = useLiveTracking(video, stream);
  const session = useLiveSession({
    stream,
    trackingReady: tracking.ready,
    positionReady: tracking.readyToStart,
    trackingError: tracking.error,
    countdownSeconds,
    userId: user?.id ?? null,
    beginSet: tracking.beginSet,
    endSet: tracking.endSet,
    stopCamera: stop,
  });
  const { countdown, running, elapsed, finished, finalReps, interrupted, draft } = session;
  const [facing, setFacing] = useState(initialFacing);
  const [playbackError, setPlaybackError] = useState("");

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    setPlaybackError("");
    let active = true;
    if (stream)
      void element.play().catch(() => {
        if (active)
          setPlaybackError("Tap the video to start the camera preview.");
      });
    return () => {
      active = false;
      element.srcObject = null;
    };
  }, [stream]);

  const trackingStatusLabel = !stream
    ? "Not connected"
    : tracking.error
      ? "Unavailable"
      : !tracking.ready
        ? "Loading model…"
        : trackingLabel(tracking.status, running, tracking.readyToStart);
  const countLabel = running ? tracking.reps : finished ? finalReps : "—";
  const liveError = error || playbackError || tracking.error;
  return (
    <>
      <div className="mb-7 flex items-center justify-between lg:mb-8">
        <div>
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">
            Live session.
          </h1>
        </div>
        <a
          className="size-11 inline-flex items-center justify-center bg-control border border-line rounded-full"
          href="#guide/two-arm-dumbbell-curl/setup"
          aria-label="Open camera setup guide"
        >
          <Icon className="size-4.75" name="guide" />
        </a>
      </div>
      <div className="grid gap-5.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.85fr)] lg:items-start">
        <div>
          <div className="relative aspect-4/5 max-h-150 bg-surface-soft overflow-hidden rounded-[22px] border border-line lg:max-h-142.5">
            <video
              ref={video}
              muted
              autoPlay
              playsInline
              className={`h-full w-full object-contain ${stream ? "bg-[#141613]" : "bg-surface-raised"} ${facing === "user" ? "-scale-x-100" : ""}`}
              onClick={() => {
                void video.current
                  ?.play()
                  .then(() => setPlaybackError(""))
                  .catch(() =>
                    setPlaybackError(
                      "Preview could not play. Try enabling the camera again.",
                    ),
                  );
              }}
              aria-label="Live camera preview"
            />
            {stream && tracking.ready && (
              <PoseOverlay
                videoRef={video}
                left={tracking.left}
                right={tracking.right}
                mirrored={facing === "user"}
              />
            )}
            <div className="absolute top-4.5 left-4.5 right-4.5 flex justify-between items-center">
              <span className="text-white text-[11px] bg-[#14161399] py-2 px-2.75 rounded-lg">
                {stream ? "Camera on" : "Camera off"}
              </span>
              {stream && (
                <button
                  className="size-11 inline-flex items-center justify-center bg-[#14161399] border border-white/20 rounded-full text-white"
                  aria-label="Switch camera"
                  disabled={running || countdown !== null || busy}
                  onClick={() => {
                    const next = facing === "user" ? "environment" : "user";
                    setFacing(next);
                    void start(next);
                  }}
                >
                  <Icon className="size-4.75" name="flip" />
                </button>
              )}
            </div>
            {!stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="size-17.5 border border-line rounded-3xl grid place-items-center mb-6.25">
                  <Icon className="size-7.25 text-secondary" name="camera" />
                </div>
                <h2 className="text-[23px] tracking-[-0.03em]">
                  Your set starts here.
                </h2>
                <p className="text-[13px] leading-[1.8] text-muted mt-3 mx-0 mb-6.75">
                  Set down your phone.
                  <br />
                  Keep both arms in the frame.
                </p>
                <button
                  className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-on-accent max-w-62.5"
                  disabled={busy}
                  onClick={() => {
                    session.startCameraPreview();
                    void start(facing);
                  }}
                >
                  {busy ? "Waiting for camera…" : "Enable camera"}
                  <Icon className="size-4.75" name="camera" />
                </button>
                {busy && (
                  <button
                    className="text-secondary text-xs p-2.5 underline-offset-4 hover:underline"
                    onClick={stop}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
            {stream && (
              <>
                <span className="absolute size-5.75 border-[#e7ecc780] pointer-events-none top-[22%] left-[14%] border-t-2 border-l-2" />
                <span className="absolute size-5.75 border-[#e7ecc780] pointer-events-none top-[22%] right-[14%] border-t-2 border-r-2" />
                <span className="absolute size-5.75 border-[#e7ecc780] pointer-events-none bottom-[14%] left-[14%] border-b-2 border-l-2" />
                <span className="absolute size-5.75 border-[#e7ecc780] pointer-events-none bottom-[14%] right-[14%] border-b-2 border-r-2" />
              </>
            )}
            {countdown !== null && countdown > 0 && (
              <div
                className="absolute inset-0 grid place-items-center text-[100px] bg-[#14161370] text-white font-medium"
                role="status"
                aria-live="assertive"
              >
                {countdown}
              </div>
            )}
            {countdown === 0 && (
              <div
                className="absolute inset-0 grid place-items-center text-center px-6 text-lg bg-[#14161370] text-white font-medium"
                role="status"
                aria-live="polite"
              >
                Hold both arms down to begin
              </div>
            )}
            {stream && (
              <div className="absolute bottom-5 left-5.5 text-[#f5f5f0] py-2.5 px-3.5 bg-[#141613a6] rounded-[9px] flex gap-4 items-center">
                <span className="text-[8px] tracking-[0.12em]">
                  SESSION TIME
                </span>
                <strong className="text-xl font-normal tabular-nums">
                  {timeLabel(elapsed)}
                </strong>
              </div>
            )}
          </div>
          {liveError && (
            <p
              className="bg-accent-soft text-secondary py-3.25 px-3.75 rounded-[9px] text-xs leading-[1.7] border-l-2 border-l-accent-line mt-4"
              role="alert"
            >
              {liveError}
            </p>
          )}
          {tracking.error && stream && (
            <button
              className="mt-2 min-h-11 px-2 text-xs text-accent underline-offset-4 hover:underline"
              onClick={tracking.retry}
            >
              Retry tracking
            </button>
          )}
          {stream && tracking.ready && (
            <TrackingDiagnostics
              runtimeVersion={tracking.runtimeVersion}
              fps={tracking.fps}
              angles={tracking.angles}
              reason={tracking.reason}
            />
          )}
          <LiveMetrics count={countLabel} tracking={trackingStatusLabel} />
        </div>
        <div className="grid gap-5 content-start">
          <section className="bg-surface border border-line rounded-[20px] p-6.25">
            <h2 className="font-medium text-[22px] tracking-[-0.035em] leading-[1.18]">
              Camera setup
            </h2>
            <ul className="grid gap-4.25 mt-6">
              {[
                "Phone is steady",
                "Both arms stay visible",
                "Movement fits in the frame",
              ].map((label) => (
                <li key={label}>
                  <label className="flex gap-3 items-center text-xs min-h-7 cursor-pointer">
                    <input className="size-4.5" type="checkbox" />
                    {label}
                  </label>
                </li>
              ))}
            </ul>
            <p className="bg-accent-soft text-secondary py-3.25 px-3.75 rounded-[9px] text-xs leading-[1.7] border-l-2 border-l-accent-line mt-5">
              Completed two-arm curls are counted during the session. Reps-left
              estimates are not available.
            </p>
            {stream && (
              <div className="mt-5 grid gap-3">
                {running ? (
                  <button
                    className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-on-accent"
                    onClick={session.endSession}
                  >
                    End session
                    <Icon className="size-4.75" name="close" />
                  </button>
                ) : countdown !== null ? (
                  <button
                    className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full border border-line bg-control"
                    onClick={session.cancelCountdown}
                  >
                    Cancel countdown
                  </button>
                ) : (
                  <button
                    className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-on-accent disabled:opacity-50"
                    disabled={!tracking.ready}
                    onClick={session.startCountdown}
                  >
                    {!tracking.ready
                      ? "Preparing tracking…"
                      : "Start live session"}
                  </button>
                )}
                {!running && (
                  <button
                    className="text-secondary text-xs p-2.5 underline-offset-4 hover:underline"
                    onClick={stop}
                  >
                    Turn off camera
                  </button>
                )}
              </div>
            )}
          </section>
          {finished && (
            <SessionSummary
              elapsed={elapsed}
              finalReps={finalReps}
              interrupted={interrupted}
              draft={draft}
              user={user}
              accountLoading={accountStatus === "loading"}
              openAccount={openAccount}
            />
          )}
          <p className="flex items-start gap-2.5 text-[11px] text-muted leading-[1.7] mt-6.25">
            <Icon className="size-4 mt-0.5" name="shield" />
            Pose tracking runs in this browser. Video is not saved or uploaded.
            Leaving this page stops the camera.
          </p>
        </div>
      </div>
    </>
  );
}
