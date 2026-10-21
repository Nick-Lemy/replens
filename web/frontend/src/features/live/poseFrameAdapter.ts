import type { PoseFrame, PoseLandmark, WorldArmLandmarks, WorldLandmark } from "./curlCounter";
import type { PoseWorkerMessage } from "./poseWorkerProtocol";

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

export function poseFrameFromMessage(message: Extract<PoseWorkerMessage, { type: "frame" }>): PoseFrame {
  return {
    timestamp: message.timestamp,
    width: message.width,
    height: message.height,
    left: armsFrom(message.landmarks, [11, 13, 15]),
    right: armsFrom(message.landmarks, [12, 14, 16]),
    worldLeft: worldArmsFrom(message.worldLandmarks, [11, 13, 15]),
    worldRight: worldArmsFrom(message.worldLandmarks, [12, 14, 16]),
  };
}
