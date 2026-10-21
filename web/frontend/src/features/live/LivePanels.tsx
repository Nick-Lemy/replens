import { SessionSaveControl } from "../sessions/SessionSaveControl";
import type { WorkoutSessionDraft } from "../sessions/api";
import type { AccountUser } from "../auth/api";
import type { TrackingStatus } from "./curlCounter";
import type { ExperimentalRirModel } from "./experimentalRirProtocol";

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function TrackingDiagnostics({
  runtimeVersion,
  fps,
  angles,
  reason,
}: {
  runtimeVersion: string;
  fps: number;
  angles: [number, number] | null;
  reason: string | null;
}) {
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-[11px] text-muted">
      <summary className="cursor-pointer select-none text-secondary">Tracking details</summary>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <dt>Pose runtime</dt>
        <dd className="text-right">{runtimeVersion || "Starting"}</dd>
        <dt>Frame rate</dt>
        <dd className="text-right tabular-nums">{fps > 0 ? `${fps.toFixed(1)} fps` : "Measuring…"}</dd>
        <dt>Left elbow flexion</dt>
        <dd className="text-right tabular-nums">{angles ? `${Math.round(angles[0])}°` : "—"}</dd>
        <dt>Right elbow flexion</dt>
        <dd className="text-right tabular-nums">{angles ? `${Math.round(angles[1])}°` : "—"}</dd>
      </dl>
      <p className="mt-3 border-t border-line pt-3 leading-[1.6]">
        Recent feedback: {reason ?? "No rejected curl."}
      </p>
    </details>
  );
}

export function LiveMetrics({
  count,
  tracking,
  demoEnabled,
  demoValue,
}: {
  count: number | string;
  tracking: string;
  demoEnabled: boolean;
  demoValue: number | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2.5 mt-4">
      <div className="py-4.25 px-3 bg-surface rounded-[13px]">
        <span className="block text-[9px] text-muted min-h-6">Completed reps</span>
        <strong className="block text-[30px] font-normal mt-1">{count}</strong>
      </div>
      <div className="py-4.25 px-3 bg-surface rounded-[13px]">
        <span className="block text-[9px] text-muted min-h-6">{demoEnabled ? "Demo reps left" : "Estimated reps left"}</span>
        <strong className="block text-[18px] font-normal mt-2 leading-[1.5]">
          {!demoEnabled || demoValue === null
            ? "—"
            : demoValue < 0
              ? "Outside demo range"
              : demoValue.toFixed(1)}
        </strong>
      </div>
      <div className="py-4.25 px-3 bg-surface rounded-[13px]">
        <span className="block text-[9px] text-muted min-h-6">Tracking</span>
        <strong className="block text-xs font-normal mt-1 leading-[1.6]">{tracking}</strong>
      </div>
    </div>
  );
}

export function ExperimentalRirPanel({
  enabled,
  onEnabledChange,
  model,
  onModelChange,
  status,
  value,
  error,
  notice,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  status: "off" | "loading" | "ready" | "error" | "unavailable";
  value: number | null;
  error: string;
  notice: string;
  model: ExperimentalRirModel;
  onModelChange: (model: ExperimentalRirModel) => void;
}) {
  return (
    <section className="bg-surface border border-line rounded-[20px] p-5">
      <h2 className="font-medium text-base">Synthetic model — not validated</h2>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-xs text-secondary">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
        Enable synthetic RIR preview
      </label>
      <label className="mt-2 grid gap-1.5 text-xs text-muted">
        Preview model
        <select
          className="min-h-11 w-full rounded-lg border border-line bg-control px-3 text-secondary"
          value={model}
          onChange={(event) => onModelChange(event.target.value as ExperimentalRirModel)}
        >
          <option value="speed-only">Speed only (default)</option>
          <option value="speed-movement">Speed + movement instability</option>
        </select>
      </label>
      {enabled && (
        <div className="mt-3 text-xs leading-[1.7] text-muted" aria-live="polite">
          <p>Demo only; not exercise advice.</p>
          {status === "loading" && <p className="mt-2">Preparing synthetic preview…</p>}
          {(status === "error" || status === "unavailable") && <p className="mt-2 text-secondary" role="status">Preview unavailable: {error}</p>}
          {status === "ready" && value === null && <p className="mt-2">A value appears only after a completed curl.</p>}
          <details className="mt-2 rounded-lg border border-line px-3 py-2">
            <summary className="cursor-pointer select-none">Model details</summary>
            <p className="mt-2">{notice || "Synthetic software check only; not research evidence or a deployable model."}</p>
            {status === "ready" && value !== null && <p className="mt-2">Raw model output: {value.toFixed(4)}</p>}
            <p className="mt-2">{model === "speed-only"
              ? "Speed inputs use estimated elbow angles and have not been validated as equivalent to the pilot pipeline."
              : "Movement instability is a wrist-tracking residual, not a calibrated tremor measure. This live approximation is not validated as equivalent to the pilot pipeline."}</p>
          </details>
        </div>
      )}
    </section>
  );
}

export function SessionSummary({
  elapsed,
  finalReps,
  interrupted,
  draft,
  user,
  accountLoading,
  openAccount,
}: {
  elapsed: number;
  finalReps: number;
  interrupted: boolean;
  draft: WorkoutSessionDraft | null;
  user: AccountUser | null;
  accountLoading: boolean;
  openAccount: () => void;
}) {
  return (
    <section className="bg-surface border border-line rounded-[20px] p-6.25" role="status">
      <p className="text-muted text-sm leading-[1.75]">Session complete</p>
      <h2 className="font-medium text-[22px] tracking-[-0.035em] leading-[1.18] mt-3">
        {timeLabel(elapsed)}
      </h2>
      <p className="text-muted text-sm leading-[1.75] mt-3">Completed curls: {finalReps}</p>
      {interrupted && (
        <p className="text-muted text-sm leading-[1.75] mt-3">
          Tracking was interrupted. The session ended, and this count includes completed curls before interruption.
        </p>
      )}
      <p className="text-muted text-sm leading-[1.75] mt-3">
        {draft ? "This summary is held in memory until you choose to save it." : "This session could not be saved as a summary."}
      </p>
      {draft && (
        <SessionSaveControl
          key={draft.clientId}
          draft={draft}
          user={user}
          accountLoading={accountLoading}
          openAccount={openAccount}
        />
      )}
      <a href="#home" className="inline-flex items-center gap-3.5 text-xs font-semibold text-accent mt-4">
        Back to home
      </a>
    </section>
  );
}

export function trackingLabel(status: TrackingStatus, running: boolean, readyToStart: boolean) {
  if (status === "both-arms") return "Keep both arms visible";
  if (status === "start-position") return "Hold both arms extended to calibrate";
  if (status === "return-bottom") return "Return both arms to start";
  if (status === "steady") return "Hold briefly for tracking";
  if (status === "tracking") {
    if (running) return "Tracking both arms";
    return readyToStart ? "Ready at start position" : "Movement detected; return to start";
  }
  return "Waiting for camera frames";
}
