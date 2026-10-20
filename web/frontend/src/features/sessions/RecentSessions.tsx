import { Icon } from "../../components/Icon";
import { useAuth } from "../auth/AuthProvider";
import { useSessionList } from "./useSessionList";

function sessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function RecentSessions() {
  const { user, status } = useAuth();
  const history = useSessionList(user?.id ?? null, 3);

  return (
    <section className="mt-6 sm:max-w-130 sm:ml-auto sm:mr-auto">
      <div className="flex items-center justify-between mb-4.5">
        <h2 className="text-base font-medium tracking-[-0.02em]">Recent sessions</h2>
        <a className="text-[11px] text-[#b5bdad] p-[10px_0_10px_12px]" href="#history">View all</a>
      </div>
      {history.loading ? (
        <p className="p-5 rounded-[17px] bg-[#1d201b] text-xs text-muted" role="status">Loading saved sessions…</p>
      ) : history.error ? (
        <div className="p-5 rounded-[17px] bg-[#1d201b]" role="status">
          <p className="text-xs text-muted">{history.error}</p>
          <button className="min-h-11 mt-2 text-xs text-accent underline-offset-4 hover:underline" onClick={history.reload}>Retry</button>
        </div>
      ) : history.items.length ? (
        <ul className="grid gap-2.5">
          {history.items.map((session) => (
            <li key={session.id} className="flex items-center gap-3.5 p-5.25 rounded-[17px] bg-[#1d201b]">
              <Icon className="size-5.75 text-[#98a08c] shrink-0" name="history" />
              <div className="min-w-0">
                <h3 className="text-xs font-medium">{session.completedReps} completed curls</h3>
                <p className="text-[11px] leading-[1.6] text-muted mt-1.25">
                  {sessionDate(session.startedAt)} · {duration(session.durationSeconds)}
                  {session.interrupted ? " · Interrupted" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3.5 p-5.25 rounded-[17px] bg-[#1d201b]">
          <Icon className="size-5.75 text-[#98a08c]" name="history" />
          <div>
            <h3 className="text-xs font-medium">{status === "authenticated" ? "No sessions yet" : status === "loading" ? "Checking account" : "Sign in to view saved sessions"}</h3>
            <p className="text-[11px] leading-[1.6] text-muted mt-1.25">Saved curl summaries appear here.</p>
          </div>
        </div>
      )}
    </section>
  );
}
