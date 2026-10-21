export type ExperimentalRirModel = "speed-only" | "speed-movement";

export type RirWorkerRequest =
  | { type: "initialize"; generation: number; model: ExperimentalRirModel }
  | { type: "predict"; generation: number; requestId: number; sessionId: number; features: number[] }
  | { type: "dispose"; generation: number };

export type RirWorkerResponse =
  | { type: "ready"; generation: number; model: ExperimentalRirModel; notice: string }
  | { type: "prediction"; generation: number; requestId: number; sessionId: number; value: number }
  | { type: "error"; generation: number; requestId?: number; message: string }
  | { type: "disposed"; generation: number };
