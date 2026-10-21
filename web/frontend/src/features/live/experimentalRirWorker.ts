import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import mjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import type { RirWorkerRequest, RirWorkerResponse } from "./experimentalRirProtocol";

interface Config {
  synthetic: true;
  deploymentApproved: false;
  version: "synthetic-rir-speed-only-v1";
  modelUrl: string;
  sha256: string;
  inputName: "features";
  featureOrder: ["mean_up_speed_deg_s", "peak_up_speed_deg_s"];
  featureDefinitionVersion: "synthetic-pilot-angular-v1";
  notice: string;
}

const MODEL_PATH = "/api/experimental-rir/assets/synthetic-rir-speed-only-v1/model.onnx";
const CONFIG_PATH = "/api/experimental-rir/config";
const NOTICE = "SYNTHETIC ONLY: software check, not research evidence or a deployable RIR model.";
interface WorkerScope {
  location: Location;
  onmessage: ((event: MessageEvent<RirWorkerRequest>) => void) | null;
  postMessage(message: RirWorkerResponse): void;
}
const scope = self as unknown as WorkerScope;
let session: ort.InferenceSession | null = null;
let generation = 0;
let stopped = false;
let installed = false;

function post(message: RirWorkerResponse) { scope.postMessage(message); }

function installFetchPolicy() {
  if (installed) return;
  installed = true;
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const allowed = new Set([new URL(wasmUrl, scope.location.origin).href, new URL(mjsUrl, scope.location.origin).href]);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const source = input instanceof Request ? input.url : String(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    let url: URL;
    try { url = new URL(source, scope.location.origin); } catch { return Promise.reject(new TypeError("Blocked synthetic model request.")); }
    const apiAllowed = url.pathname === CONFIG_PATH || url.pathname === MODEL_PATH;
    const runtimeAllowed = allowed.has(url.href);
    if (method !== "GET" || url.origin !== scope.location.origin || url.search || url.hash || !(apiAllowed || runtimeAllowed)) {
      return Promise.reject(new TypeError("Blocked synthetic model request."));
    }
    return nativeFetch(input, init);
  };
}

function validConfig(value: unknown): value is Config {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<Config>;
  return config.synthetic === true && config.deploymentApproved === false &&
    config.version === "synthetic-rir-speed-only-v1" && config.modelUrl === MODEL_PATH &&
    typeof config.sha256 === "string" && /^[a-f0-9]{64}$/.test(config.sha256) &&
    config.inputName === "features" && Array.isArray(config.featureOrder) &&
    config.featureOrder.length === 2 && config.featureOrder[0] === "mean_up_speed_deg_s" &&
    config.featureOrder[1] === "peak_up_speed_deg_s" &&
    config.featureDefinitionVersion === "synthetic-pilot-angular-v1" && config.notice === NOTICE;
}

async function initialize(requestGeneration: number) {
  if (session || stopped) return;
  generation = requestGeneration;
  try {
    installFetchPolicy();
    const response = await fetch(CONFIG_PATH, { cache: "no-store", credentials: "include" });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) throw new Error("Synthetic model config unavailable.");
    const raw: unknown = await response.json();
    if (!validConfig(raw)) throw new Error("Synthetic model config was invalid.");
    const asset = await fetch(raw.modelUrl, { cache: "no-store", credentials: "include" });
    if (!asset.ok) throw new Error("Synthetic model asset unavailable.");
    const bytes = await asset.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (digest !== raw.sha256) throw new Error("Synthetic model integrity check failed.");
    if (stopped || generation !== requestGeneration) return;
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = { wasm: new URL(wasmUrl, scope.location.origin).href, mjs: new URL(mjsUrl, scope.location.origin).href };
    session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
    if (session.inputNames.length !== 1 || session.inputNames[0] !== "features" || session.outputNames.length !== 1) {
      await session.release();
      session = null;
      throw new Error("Synthetic model input or output contract did not match.");
    }
    if (stopped || generation !== requestGeneration) { await session.release(); session = null; return; }
    post({ type: "ready", generation, notice: raw.notice });
  } catch (error) {
    post({ type: "error", generation: requestGeneration, message: error instanceof Error ? error.message : "Synthetic model could not start." });
  }
}

scope.onmessage = async (event: MessageEvent<RirWorkerRequest>) => {
  const request = event.data;
  if (request.type === "initialize") { await initialize(request.generation); return; }
  if (request.type === "dispose") {
    stopped = true;
    generation = request.generation;
    if (session) await session.release();
    session = null;
    post({ type: "disposed", generation });
    return;
  }
  if (!session || request.generation !== generation || stopped) return;
  try {
    const tensor = new ort.Tensor("float32", Float32Array.from([request.features.meanUpSpeedDegS, request.features.peakUpSpeedDegS]), [1, 2]);
    const outputs = await session.run({ features: tensor });
    const output = outputs[session.outputNames[0]];
    if (!(output instanceof ort.Tensor) || output.data.length !== 1 || typeof output.data[0] !== "number" || !Number.isFinite(output.data[0])) throw new Error("Synthetic model returned an invalid value.");
    post({ type: "prediction", generation, requestId: request.requestId, sessionId: request.sessionId, value: output.data[0] });
  } catch (error) {
    post({ type: "error", generation, requestId: request.requestId, message: error instanceof Error ? error.message : "Synthetic prediction failed." });
  }
};
