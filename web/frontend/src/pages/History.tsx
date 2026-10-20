import { useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { useAuth } from "../features/auth/AuthProvider";
import { SessionDetailDialog } from "../features/sessions/SessionDetailDialog";
import { useSessionList } from "../features/sessions/useSessionList";

function sessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function History({ openAccount }: { openAccount: () => void }) {
  const { user, status, refresh } = useAuth();
  const history = useSessionList(user?.id ?? null, 20);
  const [selectedId, setSelectedId] = useState("");
  const activeUserId = user?.id ?? null;
  const activeUserIdRef = useRef(activeUserId);
  activeUserIdRef.current = activeUserId;

  return (
    <>
      <div className="mb-7 lg:mb-8">
        <h1 className="text-[clamp(28px,_4vw,_34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">History</h1>
      </div>
      {status === "loading" ? (
        <p className="p-6 rounded-[22px] bg-[#1c1f1a] text-sm text-muted" role="status">Checking your account…</p>
      ) : status === "unavailable" ? (
        <section className="py-8 px-6 text-center bg-[#1c1f1a] border border-[#ffffff0d] rounded-[22px]">
          <p className="text-muted text-sm">Session history is unavailable until your account connection returns.</p>
          <button className="min-h-11 mt-3 text-xs text-accent underline-offset-4 hover:underline" onClick={() => void refresh()}>Retry account connection</button>
        </section>
      ) : !user ? (
        <section className="py-8 px-6 text-center bg-[#1c1f1a] border border-[#ffffff0d] rounded-[22px]">
          <div className="flex items-center justify-center mb-5">
            <Icon className="size-11 text-[#b6c0aa] p-2.5 box-content rounded-[20px] bg-[#303729]" name="history" />
          </div>
          <h2 className="text-2xl tracking-[-0.03em]">Sign in to view saved sessions.</h2>
          <p className="text-[13px] leading-[1.8] max-w-82.5 mt-3.5 mx-auto mb-6 text-muted">Session summaries are private to the account that saved them.</p>
          <button className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] max-w-70 m-auto" onClick={openAccount}>Sign in or create account</button>
        </section>
      ) : history.loading ? (
        <p className="p-6 rounded-[22px] bg-[#1c1f1a] text-sm text-muted" role="status">Loading your sessions…</p>
      ) : history.error ? (
        <section className="py-8 px-6 text-center bg-[#1c1f1a] border border-[#ffffff0d] rounded-[22px]">
          <p className="text-muted text-sm" role="alert">{history.error}</p>
          <button className="min-h-11 mt-3 text-xs text-accent underline-offset-4 hover:underline" onClick={history.reload}>Retry</button>
        </section>
      ) : history.items.length === 0 ? (
        <section className="py-8 px-6 text-center bg-[#1c1f1a] border border-[#ffffff0d] rounded-[22px]">
          <div className="flex items-center justify-center mb-5">
            <Icon className="size-11 text-[#b6c0aa] p-2.5 box-content rounded-[20px] bg-[#303729]" name="history" />
          </div>
          <h2 className="text-2xl tracking-[-0.03em]">No sessions yet.</h2>
          <p className="text-[13px] leading-[1.8] max-w-82.5 mt-3.5 mx-auto mb-6 text-muted">Save a completed live curl summary to see it here.</p>
          <a href="#live" className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] max-w-70 m-auto">Start live session</a>
        </section>
      ) : (
        <>
          <ul className="grid gap-3">
            {history.items.map((session) => (
              <li key={session.id} className="bg-surface border border-[#ffffff08] rounded-[18px]">
                <button className="flex items-center gap-4 p-5 w-full min-h-18 text-left" onClick={() => setSelectedId(session.id)}>
                  <span className="flex items-center justify-center size-11 rounded-full bg-[#ffffff06] shrink-0">
                    <Icon className="size-5 text-[#b4bdab]" name="history" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{session.completedReps} completed curls</span>
                    <span className="block text-xs text-muted mt-1.5">{sessionDate(session.startedAt)} · {duration(session.durationSeconds)}</span>
                    {session.interrupted && <span className="block text-[11px] text-muted mt-1">Interrupted</span>}
                  </span>
                  <span className="sr-only">View details</span>
                </button>
              </li>
            ))}
          </ul>
          {history.nextCursor && (
            <button
              className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full border border-[#ffffff26] bg-[#ffffff03] mt-4 disabled:opacity-50"
              disabled={history.loadingMore}
              onClick={() => void history.loadMore()}
            >
              {history.loadingMore ? "Loading more…" : "Load more sessions"}
            </button>
          )}
          {history.error && <p className="mt-3 text-xs text-accent" role="alert">{history.error}</p>}
        </>
      )}
      {selectedId && activeUserId && (
        <SessionDetailDialog
          key={`${activeUserId}:${selectedId}`}
          id={selectedId}
          userId={activeUserId}
          refreshAuth={refresh}
          onClose={() => setSelectedId("")}
          onDeleted={(id, ownerId) => {
            if (ownerId !== activeUserIdRef.current) return;
            history.remove(id);
            setSelectedId("");
          }}
        />
      )}
    </>
  );
}
