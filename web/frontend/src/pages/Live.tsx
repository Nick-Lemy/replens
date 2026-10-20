import { useEffect, useRef, useState } from "react";
import { useCamera, type Facing } from "../hooks/useCamera";
import { Icon } from "../components/Icon";
import { useLiveTracking } from "../features/live/useLiveTracking";
import { PoseOverlay } from "../features/live/PoseOverlay";

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function Live({
  initialFacing,
  countdownSeconds,
}: {
  initialFacing: Facing;
  countdownSeconds: number;
}) {
  const { stream, busy, error, start, stop } = useCamera();
  const video = useRef<HTMLVideoElement>(null);
  const tracking = useLiveTracking(video, stream);
  const [facing, setFacing] = useState(initialFacing);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalReps, setFinalReps] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const startedAt = useRef(0);
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

  useEffect(() => {
    if (stream) return;
    setCountdown(null);
    setRunning(false);
  }, [stream]);

  useEffect(() => {
    if (countdown === null || !stream) return;
    if (!tracking.ready) {
      setCountdown(null);
      return;
    }
    if (countdown === 0) {
      startedAt.current = Date.now();
      setElapsed(0);
      setFinalReps(0);
      tracking.beginSet();
      setRunning(true);
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, stream, tracking.ready, tracking.beginSet]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || !tracking.error) return;
    setFinalReps(tracking.endSet());
    setInterrupted(true);
    setRunning(false);
    setCountdown(null);
    setFinished(true);
    stop();
  }, [running, tracking.error, tracking.endSet, stop]);

  const end = () => {
    setFinalReps(tracking.endSet());
    setRunning(false);
    setCountdown(null);
    setFinished(true);
    setInterrupted(false);
    stop();
  };
  const trackingLabel = !stream
    ? "Not connected"
    : tracking.error
      ? "Unavailable"
      : !tracking.ready
        ? "Loading model…"
        : tracking.status === "both-arms"
          ? "Keep both arms visible"
          : tracking.status === "start-position"
            ? "Start with arms extended"
            : tracking.status === "return-bottom"
              ? "Return both arms to start"
              : tracking.status === "steady"
                ? "Hold briefly for tracking"
                : tracking.status === "tracking"
                  ? "Tracking both arms"
                  : "Waiting for camera frames";
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
          className="size-11 inline-flex items-center justify-center bg-[#ffffff06] border border-[#ffffff1a] rounded-full"
          href="#guide/two-arm-dumbbell-curl/setup"
          aria-label="Open camera setup guide"
        >
          <Icon className="size-4.75" name="guide" />
        </a>
      </div>
      <div className="grid gap-5.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.85fr)] lg:items-start">
        <div>
          <div className="relative aspect-4/5 max-h-150 bg-[#232720] overflow-hidden rounded-[22px] border border-[#ffffff13] lg:max-h-142.5">
            <video
              ref={video}
              muted
              autoPlay
              playsInline
              className={`h-full w-full object-contain bg-[#1d211a] ${facing === "user" ? "-scale-x-100" : ""}`}
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
              <span className="text-foreground text-[11px] bg-[#14161399] py-2 px-2.75 rounded-lg">
                {stream ? "Camera on" : "Camera off"}
              </span>
              {stream && (
                <button
                  className="size-11 inline-flex items-center justify-center bg-[#14161399] border border-[#ffffff1a] rounded-full"
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
                <div className="size-17.5 border border-[#68765a] rounded-3xl grid place-items-center mb-6.25">
                  <Icon className="size-7.25 text-[#b9c5aa]" name="camera" />
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
                  className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] max-w-62.5"
                  disabled={busy}
                  onClick={() => {
                    setFinished(false);
                    setElapsed(0);
                    void start(facing);
                  }}
                >
                  {busy ? "Waiting for camera…" : "Enable camera"}
                  <Icon className="size-4.75" name="camera" />
                </button>
                {busy && (
                  <button
                    className="text-[#c9d0bf] text-xs p-2.5 underline-offset-4 hover:underline"
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
                className="absolute inset-0 grid place-items-center text-[100px] bg-[#14161370] font-medium"
                role="status"
                aria-live="assertive"
              >
                {countdown}
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
              className="bg-[#f2b85b0a] text-[#c6cbbd] py-3.25 px-3.75 rounded-[9px] text-xs leading-[1.7] border-l-2 border-l-[#a98546] mt-4"
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
          <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2.5 mt-4">
            <div className="py-4.25 px-3 bg-surface rounded-[13px]">
              <span className="block text-[9px] text-muted min-h-6">
                Completed reps
              </span>
              <strong className="block text-[30px] font-normal mt-1">{countLabel}</strong>
            </div>
            <div className="py-4.25 px-3 bg-surface rounded-[13px]">
              <span className="block text-[9px] text-muted min-h-6">
                Estimated reps left
              </span>
              <strong className="block text-[30px] font-normal mt-1">—</strong>
            </div>
            <div className="py-4.25 px-3 bg-surface rounded-[13px]">
              <span className="block text-[9px] text-muted min-h-6">
                Tracking
              </span>
              <strong className="block text-xs font-normal mt-1 leading-[1.6]">
                {trackingLabel}
              </strong>
            </div>
          </div>
        </div>
        <div className="grid gap-5 content-start">
          <section className="bg-surface border border-[#ffffff08] rounded-[20px] p-6.25">
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
            <p className="bg-[#f2b85b0a] text-[#c6cbbd] py-3.25 px-3.75 rounded-[9px] text-xs leading-[1.7] border-l-2 border-l-[#a98546] mt-5">
              Completed two-arm curls are counted during the session. Reps-left
              estimates are not available.
            </p>
            {stream && (
              <div className="mt-5 grid gap-3">
                {running ? (
                  <button
                    className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b]"
                    onClick={end}
                  >
                    End session
                    <Icon className="size-4.75" name="close" />
                  </button>
                ) : countdown !== null ? (
                  <button
                    className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full border border-[#ffffff26] bg-[#ffffff03]"
                    onClick={() => setCountdown(null)}
                  >
                    Cancel countdown
                  </button>
                ) : (
                  <button
                    className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] disabled:opacity-50"
                    disabled={!tracking.ready}
                    onClick={() => {
                      setFinished(false);
                      setInterrupted(false);
                      setCountdown(countdownSeconds);
                    }}
                  >
                    {tracking.ready ? "Start live session" : "Preparing tracking…"}
                  </button>
                )}
                {!running && (
                  <button
                    className="text-[#c9d0bf] text-xs p-2.5 underline-offset-4 hover:underline"
                    onClick={stop}
                  >
                    Turn off camera
                  </button>
                )}
              </div>
            )}
          </section>
          {finished && (
            <section
              className="bg-surface border border-[#ffffff08] rounded-[20px] p-6.25"
              role="status"
            >
              <p className="text-muted text-sm leading-[1.75]">
                Session complete
              </p>
              <h2 className="font-medium text-[22px] tracking-[-0.035em] leading-[1.18] mt-3">
                {timeLabel(elapsed)}
              </h2>
              <p className="text-muted text-sm leading-[1.75] mt-3">
                Completed curls: {finalReps}
              </p>
              {interrupted && (
                <p className="text-muted text-sm leading-[1.75] mt-3">
                  Tracking was interrupted. The session ended, and this count
                  includes completed curls before interruption.
                </p>
              )}
              <p className="text-muted text-sm leading-[1.75] mt-3">
                This session is not saved. Its count stays on this page only.
              </p>
              <a
                href="#home"
                className="inline-flex items-center gap-3.5 text-xs font-semibold text-accent mt-4"
              >
                Back to home
              </a>
            </section>
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
