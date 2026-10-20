import { useEffect, useRef, type RefObject } from "react";
import type { ArmLandmarks } from "./curlCounter";

export function PoseOverlay({
  videoRef,
  left,
  right,
  mirrored,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  left: ArmLandmarks | null;
  right: ArmLandmarks | null;
  mirrored: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !video || !context) return;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      if (!video.videoWidth || !video.videoHeight) return;

      const scale = Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
      const drawnWidth = video.videoWidth * scale;
      const drawnHeight = video.videoHeight * scale;
      const offsetX = (bounds.width - drawnWidth) / 2;
      const offsetY = (bounds.height - drawnHeight) / 2;
      const map = (point: ArmLandmarks["shoulder"]) => [
        offsetX + point.x * drawnWidth,
        offsetY + point.y * drawnHeight,
      ] as const;

      for (const arm of [left, right]) {
        if (
          !arm ||
          [arm.shoulder, arm.elbow, arm.wrist].some(
            (point) =>
              point.visibility < 0.6 ||
              point.x < 0 ||
              point.x > 1 ||
              point.y < 0 ||
              point.y > 1,
          )
        ) {
          continue;
        }
        const shoulder = map(arm.shoulder);
        const elbow = map(arm.elbow);
        const wrist = map(arm.wrist);
        context.strokeStyle = "#f2b85b";
        context.lineWidth = 3;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(shoulder[0], shoulder[1]);
        context.lineTo(elbow[0], elbow[1]);
        context.lineTo(wrist[0], wrist[1]);
        context.stroke();
        for (const [x, y] of [shoulder, elbow, wrist]) {
          context.fillStyle = "#fff5dd";
          context.beginPath();
          context.arc(x, y, 4.5, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    video.addEventListener("loadedmetadata", draw);
    draw();
    return () => {
      resize.disconnect();
      video.removeEventListener("loadedmetadata", draw);
    };
  }, [left, right, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full pointer-events-none ${mirrored ? "-scale-x-100" : ""}`}
    />
  );
}
