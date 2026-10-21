import { useEffect, useRef, useState } from "react";
import type { CompletedRepEvent } from "./useLiveTracking";
import type { ExperimentalRirModel, RirWorkerResponse } from "./experimentalRirProtocol";
import { extractMovementInstability } from "./movementInstabilityFeatures";

type State = {
  status: "off" | "loading" | "ready" | "error" | "unavailable";
  value: number | null;
  error: string;
  errorScope: "initialization" | "prediction" | null;
  notice: string;
  model: ExperimentalRirModel | null;
};
const initial: State = { status: "off", value: null, error: "", errorScope: null, notice: "", model: null };

export function useExperimentalRir(enabled: boolean, model: ExperimentalRirModel, trackingReady: boolean, sessionId: number, completedRep: CompletedRepEvent | null) {
  const [state, setState] = useState<State>(initial);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const runtimeReadyRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const generationRef = useRef(0);
  const requestRef = useRef(0);
  const activeRef = useRef({ generation: 0, sessionId, requestId: 0 });
  const consumedRef = useRef({ sessionId, sequence: 0 });
  const predictionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !trackingReady) {
      runtimeReadyRef.current = false;
      setRuntimeReady(false);
      if (!enabled) setState(initial);
      else setState((current) => current.errorScope === "initialization"
        ? current
        : { ...initial, model, status: "loading" });
      return;
    }
    let active = true;
    const generation = ++generationRef.current;
    activeRef.current = { generation, sessionId, requestId: 0 };
    consumedRef.current = { sessionId, sequence: 0 };
    runtimeReadyRef.current = false;
    setRuntimeReady(false);
    setState({ ...initial, model, status: "loading" });
    let worker: Worker;
    try {
      worker = new Worker(new URL("./experimentalRirWorker.ts", import.meta.url), { type: "module", name: "replens-synthetic-rir" });
    } catch {
      setState({ ...initial, model, status: "error", errorScope: "initialization", error: "Synthetic preview could not start in this browser." });
      return;
    }
    workerRef.current = worker;
    const failInit = () => {
      if (!active) return;
      active = false;
      runtimeReadyRef.current = false;
      setRuntimeReady(false);
      setState({ ...initial, model, status: "error", errorScope: "initialization", error: "Synthetic preview is taking too long to load." });
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    const initTimer = window.setTimeout(failInit, 30_000);
    worker.onmessage = (event: MessageEvent<RirWorkerResponse>) => {
      const message = event.data;
      if (!active || message.generation !== generation) return;
      if (message.type === "ready") {
        if (message.model !== model) return;
        clearTimeout(initTimer);
        runtimeReadyRef.current = true;
        setRuntimeReady(true);
        setState({ status: "ready", value: null, error: "", errorScope: null, notice: message.notice, model });
        return;
      }
      if (message.type === "error") {
        if (message.requestId !== undefined && message.requestId !== activeRef.current.requestId) return;
        if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
        predictionTimerRef.current = null;
        if (message.requestId === undefined) {
          active = false;
          runtimeReadyRef.current = false;
          setRuntimeReady(false);
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
        }
        setState((current) => ({ ...current, model, status: "error", value: null, errorScope: message.requestId === undefined ? "initialization" : "prediction", error: message.message }));
        return;
      }
      if (message.type === "prediction") {
        const activeRequest = activeRef.current;
        if (message.sessionId !== activeRequest.sessionId || message.requestId !== activeRequest.requestId || !Number.isFinite(message.value)) return;
        if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
        predictionTimerRef.current = null;
        setState((current) => ({ ...current, status: "ready", value: message.value, error: "" }));
      }
    };
    worker.onerror = () => {
      if (!active) return;
      active = false;
      runtimeReadyRef.current = false;
      setRuntimeReady(false);
      setState({ ...initial, model, status: "error", errorScope: "initialization", error: "Synthetic preview stopped unexpectedly." });
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    worker.onmessageerror = () => {
      if (!active) return;
      active = false;
      runtimeReadyRef.current = false;
      setRuntimeReady(false);
      setState({ ...initial, model, status: "error", errorScope: "initialization", error: "Synthetic preview returned an unreadable result." });
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    worker.postMessage({ type: "initialize", generation, model });
    return () => {
      active = false;
      clearTimeout(initTimer);
      if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
      predictionTimerRef.current = null;
      runtimeReadyRef.current = false;
      setRuntimeReady(false);
      try { worker.postMessage({ type: "dispose", generation: generation + 1 }); } catch { /* Worker may already be stopped. */ }
      window.setTimeout(() => worker.terminate(), 250);
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [enabled, model, trackingReady]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!enabled || !trackingReady) {
      if (!enabled) setState(initial);
      else setState((current) => current.errorScope === "initialization"
        ? current
        : { ...initial, model, status: "loading" });
      return;
    }
    if (!completedRep || completedRep.sessionId !== sessionId) {
      activeRef.current = { ...activeRef.current, sessionId, requestId: ++requestRef.current };
      consumedRef.current = { sessionId, sequence: 0 };
      if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
      predictionTimerRef.current = null;
      setState((current) => current.errorScope === "initialization"
        ? { ...current, value: null }
        : { ...current, status: runtimeReadyRef.current ? "ready" : "loading", value: null, error: "", errorScope: null });
      return;
    }
    if (consumedRef.current.sessionId !== sessionId) consumedRef.current = { sessionId, sequence: 0 };
    if (completedRep.sequence <= consumedRef.current.sequence) return;
    if (!runtimeReadyRef.current || !worker) return;
    const movementInstability = model === "speed-movement"
      ? extractMovementInstability(completedRep.samples, completedRep.topTimestampMs)
      : null;
    if (model === "speed-movement" && movementInstability === null) {
      consumedRef.current.sequence = completedRep.sequence;
      activeRef.current = { ...activeRef.current, sessionId, requestId: ++requestRef.current };
      if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
      predictionTimerRef.current = null;
      setState((current) => ({ ...current, status: "unavailable", value: null, errorScope: "prediction", error: "Movement-instability input is unavailable for this curl. The counter still accepts the curl." }));
      return;
    }
    consumedRef.current.sequence = completedRep.sequence;
    if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
    const requestId = ++requestRef.current;
    activeRef.current = { generation: activeRef.current.generation, sessionId, requestId };
    setState((current) => ({ ...current, value: null, error: "", errorScope: null, status: "loading" }));
    const features = model === "speed-movement"
      ? [completedRep.meanUpSpeedDegS, completedRep.peakUpSpeedDegS, movementInstability!]
      : [completedRep.meanUpSpeedDegS, completedRep.peakUpSpeedDegS];
    worker.postMessage({ type: "predict", generation: activeRef.current.generation, requestId, sessionId, features });
    predictionTimerRef.current = window.setTimeout(() => {
      if (activeRef.current.requestId === requestId) {
        activeRef.current = { ...activeRef.current, requestId: ++requestRef.current };
        setState((current) => ({ ...current, status: "error", value: null, errorScope: "prediction", error: "Synthetic preview timed out." }));
      }
    }, 5_000);
  }, [completedRep, enabled, model, runtimeReady, sessionId, trackingReady]);

  if (!enabled) return initial;
  return state.model === model ? state : { ...initial, model, status: "loading" as const };
}
