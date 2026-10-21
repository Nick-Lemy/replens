import type { AngularSpeedFeatures } from "./angularSpeedFeatures";

export type RirWorkerRequest =
  | { type: "initialize"; generation: number }
  | { type: "predict"; generation: number; requestId: number; sessionId: number; features: Pick<AngularSpeedFeatures, "meanUpSpeedDegS" | "peakUpSpeedDegS"> }
  | { type: "dispose"; generation: number };

export type RirWorkerResponse =
  | { type: "ready"; generation: number; notice: string }
  | { type: "prediction"; generation: number; requestId: number; sessionId: number; value: number }
  | { type: "error"; generation: number; requestId?: number; message: string }
  | { type: "disposed"; generation: number };
