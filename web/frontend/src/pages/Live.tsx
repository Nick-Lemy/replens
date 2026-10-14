import { useEffect, useRef, useState } from "react";
import { useCamera, type Facing } from "../hooks/useCamera";
import { Icon } from "../components/Icon";

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
  const [facing, setFacing] = useState(initialFacing);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
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
    if (countdown === 0) {
      startedAt.current = Date.now();
      setElapsed(0);
      setRunning(true);
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, stream]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [running]);

  const end = () => {
    setRunning(false);
    setCountdown(null);
    setFinished(true);
    stop();
  };
  return (
    <>
      <div className="page-heading live-heading">
        <div>
          <h1 className="page-title">Live session.</h1>
        </div>
        <a
          className="icon-button"
          href="#guide/two-arm-dumbbell-curl/setup"
          aria-label="Open camera setup guide"
        >
          <Icon name="guide" />
        </a>
      </div>
      <div className="live-grid">
        <div>
          <div className="camera-frame">
            <video
              ref={video}
              muted
              autoPlay
              playsInline
              className={facing === "user" ? "mirrored" : ""}
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
            <div className="camera-top">
              <span className="camera-state">
                {stream ? "Camera on" : "Camera off"}
              </span>
              {stream && (
                <button
                  className="icon-button"
                  aria-label="Switch camera"
                  disabled={running || countdown !== null || busy}
                  onClick={() => {
                    const next = facing === "user" ? "environment" : "user";
                    setFacing(next);
                    void start(next);
                  }}
                >
                  <Icon name="flip" />
                </button>
              )}
            </div>
            {!stream && (
              <div className="camera-placeholder">
                <div className="camera-symbol">
                  <Icon name="camera" />
                </div>
                <h2>Your set starts here.</h2>
                <p>
                  Set down your phone.
                  <br />
                  Keep both arms in the frame.
                </p>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => {
                    setFinished(false);
                    setElapsed(0);
                    void start(facing);
                  }}
                >
                  {busy ? "Waiting for camera…" : "Enable camera"}
                  <Icon name="camera" />
                </button>
                {busy && (
                  <button className="text-button" onClick={stop}>
                    Cancel
                  </button>
                )}
              </div>
            )}
            {stream && (
              <>
                <span className="frame-corner top-left" />
                <span className="frame-corner top-right" />
                <span className="frame-corner bottom-left" />
                <span className="frame-corner bottom-right" />
              </>
            )}
            {countdown !== null && countdown > 0 && (
              <div className="countdown" role="status" aria-live="assertive">
                {countdown}
              </div>
            )}
            {stream && (
              <div className="camera-bottom">
                <span>PREVIEW TIME</span>
                <strong>{timeLabel(elapsed)}</strong>
              </div>
            )}
          </div>
          {(error || playbackError) && (
            <p className="notice mt-4" role="alert">
              {error || playbackError}
            </p>
          )}
          <div className="session-metrics">
            <div>
              <span>Completed reps</span>
              <strong>—</strong>
            </div>
            <div>
              <span>Estimated reps left</span>
              <strong>—</strong>
            </div>
            <div>
              <span>Tracking</span>
              <strong className="metric-status">Not connected</strong>
            </div>
          </div>
        </div>
        <div className="live-sidebar">
          <section className="surface-card">
            <h2 className="card-title">Camera setup</h2>
            <ul className="check-list">
              {[
                "Phone is steady",
                "Both arms stay visible",
                "Movement fits in the frame",
              ].map((label) => (
                <li key={label}>
                  <label>
                    <input type="checkbox" />
                    {label}
                  </label>
                </li>
              ))}
            </ul>
            <p className="notice mt-5">
              Camera preview is available. Rep tracking and reps-left
              predictions are not connected yet.
            </p>
            {stream && (
              <div className="mt-5 grid gap-3">
                {running ? (
                  <button className="primary-button" onClick={end}>
                    End preview
                    <Icon name="close" />
                  </button>
                ) : countdown !== null ? (
                  <button
                    className="secondary-button"
                    onClick={() => setCountdown(null)}
                  >
                    Cancel countdown
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() => {
                      setFinished(false);
                      setCountdown(countdownSeconds);
                    }}
                  >
                    Start camera preview
                    <Icon name="arrow" />
                  </button>
                )}
                {!running && (
                  <button className="text-button" onClick={stop}>
                    Turn off camera
                  </button>
                )}
              </div>
            )}
          </section>
          {finished && (
            <section className="surface-card" role="status">
              <p className="description">Preview complete</p>
              <h2 className="card-title mt-3">{timeLabel(elapsed)}</h2>
              <p className="description mt-3">
                No video or exercise results were saved.
              </p>
              <a href="#home" className="inline-link mt-4">
                Back to home
                <Icon name="arrow" />
              </a>
            </section>
          )}
          <p className="quiet-note">
            <Icon name="shield" />
            This preview uses your camera on this device. It does not save or
            upload video. Leaving this page stops the camera.
          </p>
        </div>
      </div>
    </>
  );
}
