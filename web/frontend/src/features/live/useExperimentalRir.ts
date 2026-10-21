import { useEffect, useRef, useState } from "react";
import type { CompletedRepEvent } from "./useLiveTracking";
import type { RirWorkerResponse } from "./experimentalRirProtocol";

type State = { status: "off" | "loading" | "ready" | "error"; value: number | null; error: string; notice: string };
const initial: State = { status: "off", value: null, error: "", notice: "" };

export function useExperimentalRir(enabled: boolean, trackingReady: boolean, sessionId: number, completedRep: CompletedRepEvent | null) {
  const [state, setState] = useState<State>(initial);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const generationRef = useRef(0);
  const requestRef = useRef(0);
  const activeRef = useRef({ generation: 0, sessionId, requestId: 0 });
  const consumedRef = useRef({ sessionId, sequence: 0 });
  const predictionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !trackingReady) {
      setRuntimeReady(false);
      setState(enabled ? { ...initial, status: "loading" } : initial);
      return;
    }
    let active = true;
    const generation = ++generationRef.current;
    activeRef.current = { generation, sessionId, requestId: 0 };
    consumedRef.current = { sessionId, sequence: 0 };
    setRuntimeReady(false);
    setState({ ...initial, status: "loading" });
    let worker: Worker;
    try {
      worker = new Worker(new URL("./experimentalRirWorker.ts", import.meta.url), { type: "module", name: "replens-synthetic-rir" });
    } catch {
      setState({ ...initial, status: "error", error: "Synthetic preview could not start in this browser." });
      return;
    }
    workerRef.current = worker;
    const failInit = () => {
      if (!active) return;
      active = false;
      setRuntimeReady(false);
      setState({ ...initial, status: "error", error: "Synthetic preview is taking too long to load." });
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    const initTimer = window.setTimeout(failInit, 30_000);
    worker.onmessage = (event: MessageEvent<RirWorkerResponse>) => {
      const message = event.data;
      if (!active || message.generation !== generation) return;
      if (message.type === "ready") {
        clearTimeout(initTimer);
        setRuntimeReady(true);
        setState({ status: "ready", value: null, error: "", notice: message.notice });
        return;
      }
      if (message.type === "error") {
        if (message.requestId !== undefined && message.requestId !== activeRef.current.requestId) return;
        if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
        predictionTimerRef.current = null;
        if (message.requestId === undefined) {
          active = false;
          setRuntimeReady(false);
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
        }
        setState((current) => ({ ...current, status: "error", value: null, error: message.message }));
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
      setRuntimeReady(false);
      setState({ ...initial, status: "error", error: "Synthetic preview stopped unexpectedly." });
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    worker.onmessageerror = () => {
      if (!active) return;
      active = false;
      setRuntimeReady(false);
      setState({ ...initial, status: "error", error: "Synthetic preview returned an unreadable result." });
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    worker.postMessage({ type: "initialize", generation });
    return () => {
      active = false;
      clearTimeout(initTimer);
      if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
      predictionTimerRef.current = null;
      setRuntimeReady(false);
      try { worker.postMessage({ type: "dispose", generation: generation + 1 }); } catch { /* Worker may already be stopped. */ }
      window.setTimeout(() => worker.terminate(), 250);
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [enabled, trackingReady]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!enabled || !trackingReady) {
      setState(enabled ? { ...initial, status: "loading" } : initial);
      return;
    }
    if (!completedRep || completedRep.sessionId !== sessionId) {
      activeRef.current = { ...activeRef.current, sessionId, requestId: ++requestRef.current };
      consumedRef.current = { sessionId, sequence: 0 };
      if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
      predictionTimerRef.current = null;
      setState((current) => current.value === null ? current : { ...current, value: null });
      return;
    }
    if (!runtimeReady || !worker) return;
    if (consumedRef.current.sessionId !== sessionId) consumedRef.current = { sessionId, sequence: 0 };
    if (completedRep.sequence <= consumedRef.current.sequence) return;
    consumedRef.current.sequence = completedRep.sequence;
    if (predictionTimerRef.current !== null) clearTimeout(predictionTimerRef.current);
    const requestId = ++requestRef.current;
    activeRef.current = { generation: activeRef.current.generation, sessionId, requestId };
    setState((current) => ({ ...current, value: null, error: "", status: "loading" }));
    worker.postMessage({
      type: "predict",
      generation: activeRef.current.generation,
      requestId,
      sessionId,
      features: { meanUpSpeedDegS: completedRep.meanUpSpeedDegS, peakUpSpeedDegS: completedRep.peakUpSpeedDegS },
    });
    predictionTimerRef.current = window.setTimeout(() => {
      if (activeRef.current.requestId === requestId) {
        activeRef.current = { ...activeRef.current, requestId: ++requestRef.current };
        setState((current) => ({ ...current, status: "error", value: null, error: "Synthetic preview timed out." }));
      }
    }, 5_000);
  }, [completedRep, enabled, runtimeReady, sessionId, trackingReady]);

  if (!enabled) return initial;
  return state;
}
