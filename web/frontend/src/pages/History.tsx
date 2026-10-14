import { Icon } from "../components/Icon";

export function History({ openAccount }: { openAccount: () => void }) {
  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">History</h1>
      </div>
      <section className="history-empty">
        <div className="empty-art">
          <span />
          <Icon name="history" />
          <span />
        </div>
        <h2>No sessions yet.</h2>
        <p>
          Once live tracking is ready, your saved sets will appear here. Camera
          previews are not saved as training sessions.
        </p>
        <a href="#live" className="primary-button">
          Explore camera setup
          <Icon name="arrow" />
        </a>
      </section>
      <button
        className="compact-card mt-6 w-full text-left"
        onClick={openAccount}
      >
        <span className="round-icon">
          <Icon name="user" />
        </span>
        <div>
          <h2 className="font-semibold">Keep your progress with you</h2>
          <p className="text-sm text-muted mt-1">
            Account access is coming next
          </p>
        </div>
        <Icon name="chevron" className="ml-auto size-5" />
      </button>
    </>
  );
}
