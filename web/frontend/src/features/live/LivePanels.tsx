import { SessionSaveControl } from "../sessions/SessionSaveControl";
import type { WorkoutSessionDraft } from "../sessions/api";
import type { AccountUser } from "../auth/api";
import type { TrackingStatus } from "./curlCounter";

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
}: {
  count: number | string;
  tracking: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2.5 mt-4">
      <div className="py-4.25 px-3 bg-surface rounded-[13px]">
        <span className="block text-[9px] text-muted min-h-6">Completed reps</span>
        <strong className="block text-[30px] font-normal mt-1">{count}</strong>
      </div>
      <div className="py-4.25 px-3 bg-surface rounded-[13px]">
        <span className="block text-[9px] text-muted min-h-6">Estimated reps left</span>
        <strong className="block text-[30px] font-normal mt-1">—</strong>
      </div>
      <div className="py-4.25 px-3 bg-surface rounded-[13px]">
        <span className="block text-[9px] text-muted min-h-6">Tracking</span>
        <strong className="block text-xs font-normal mt-1 leading-[1.6]">{tracking}</strong>
      </div>
    </div>
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
