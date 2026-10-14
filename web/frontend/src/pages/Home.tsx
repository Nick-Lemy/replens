import { CurlIllustration } from "../components/CurlIllustration";
import { Icon } from "../components/Icon";

export function Home() {
  return (
    <>
      <div className="page-heading home-heading">
        <h1 className="page-title">Let’s train.</h1>
        <p className="description">Ready for your next set?</p>
      </div>

      <section className="workout-card" aria-labelledby="workout-title">
        <a
          className="workout-image"
          href="#live"
          aria-label="Set up a biceps curl session"
        >
          <CurlIllustration className="workout-athlete" />
        </a>
        <div className="workout-details">
          <div className="workout-title-row">
            <div>
              <h2 id="workout-title">Biceps curls</h2>
              <p>Two-arm curl · Dumbbells</p>
            </div>
            <Icon name="dumbbell" />
          </div>
          <a className="primary-button" href="#live">
            Start live session
            <Icon name="arrow" />
          </a>
          <p className="availability-note">
            Camera preview available. Live tracking coming next.
          </p>
        </div>
      </section>

      <a className="guide-row" href="#guide/two-arm-dumbbell-curl">
        <span className="round-icon">
          <Icon name="guide" />
        </span>
        <div>
          <h2>Curl guide</h2>
          <p>Movement and camera setup</p>
        </div>
        <Icon name="chevron" className="ml-auto size-5" />
      </a>

      <section className="recent-section">
        <div className="section-heading">
          <h2>Recent sessions</h2>
          <a href="#history">View all</a>
        </div>
        <div className="recent-empty">
          <Icon name="history" />
          <div>
            <h3>No sessions yet</h3>
            <p>Your saved sets will appear here.</p>
          </div>
        </div>
      </section>
    </>
  );
}
