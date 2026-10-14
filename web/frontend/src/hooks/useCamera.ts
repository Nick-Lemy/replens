import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";
export function useCamera() {
  const activeStream = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    requestId.current += 1;
    activeStream.current?.getTracks().forEach((track) => track.stop());
    activeStream.current = null;
    setStream(null);
    setBusy(false);
  }, []);

  const start = useCallback(
    async (facing: Facing) => {
      stop();
      const id = requestId.current;
      setError("");
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera access needs HTTPS or localhost and a supported browser.",
        );
        return;
      }
      setBusy(true);
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (id !== requestId.current) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        activeStream.current = next;
        setStream(next);
        next.getVideoTracks().forEach((track) =>
          track.addEventListener(
            "ended",
            () => {
              if (activeStream.current === next) {
                stop();
                setError("The camera stopped. Enable it again to continue.");
              }
            },
            { once: true },
          ),
        );
      } catch (cause) {
        if (id !== requestId.current) return;
        const name = cause instanceof DOMException ? cause.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera access was denied. Allow it in your browser settings, then try again."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : "The camera could not start. Close other apps using it and try again.",
        );
      } finally {
        if (id === requestId.current) setBusy(false);
      }
    },
    [stop],
  );

  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      requestId.current += 1;
      activeStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [stop]);

  return { stream, busy, error, start, stop };
}
