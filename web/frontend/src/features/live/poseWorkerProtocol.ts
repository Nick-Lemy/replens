import type { PoseLandmark, WorldLandmark } from "./curlCounter";

export type PoseWorkerRequest =
  | { type: "initialize" }
  | { type: "frame"; bitmap: ImageBitmap; timestamp: number }
  | { type: "stop" };

export type PoseWorkerMessage =
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
