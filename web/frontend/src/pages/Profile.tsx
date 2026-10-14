import { Icon } from "../components/Icon";
import type { Facing } from "../hooks/useCamera";

export interface Preferences {
  facing: Facing;
  countdown: number;
}
export function Profile({
  preferences,
  update,
  openAccount,
  install,
  canInstall,
  installed,
}: {
  preferences: Preferences;
  update: (value: Preferences) => void;
  openAccount: () => void;
  install: () => Promise<void>;
  canInstall: boolean;
  installed: boolean;
}) {
  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Profile</h1>
      </div>
      <div className="profile-grid">
        <section className="surface-card">
          <div className="guest-avatar">
            <Icon name="user" />
          </div>
          <h2 className="card-title mt-5">Guest account</h2>
          <p className="description mt-3">
            Account access will let you save and revisit your sessions.
          </p>
          <button className="primary-button mt-6" onClick={openAccount}>
            View account setup
            <Icon name="arrow" />
          </button>
        </section>
        <div className="grid gap-5">
          <section className="surface-card">
            <h2 className="font-semibold">Camera preferences</h2>
            <label className="setting-row">
              <span>Preferred camera</span>
              <select
                value={preferences.facing}
                onChange={(event) =>
                  update({
                    ...preferences,
                    facing: event.target.value as Facing,
                  })
                }
              >
                <option value="user">Front camera</option>
                <option value="environment">Rear camera</option>
              </select>
            </label>
            <label className="setting-row">
              <span>Preview countdown</span>
              <select
                value={preferences.countdown}
                onChange={(event) =>
                  update({
                    ...preferences,
                    countdown: Number(event.target.value),
                  })
                }
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </label>
            <p className="text-xs text-muted mt-4">
              Preferences stay in this browser.
            </p>
          </section>
          <section className="surface-card">
            <h2 className="card-title">Add to home screen</h2>
            <p className="description mt-3">
              Add RepLens to your home screen for an app-like experience.
            </p>
            {installed ? (
              <p className="inline-link mt-4">
                <Icon name="check" />
                You’re using the installed app
              </p>
            ) : canInstall ? (
              <button
                className="secondary-button mt-5"
                onClick={() => {
                  void install();
                }}
              >
                Install RepLens
                <Icon name="download" />
              </button>
            ) : (
              <details className="install-help mt-4">
                <summary>How to add to home screen</summary>
                <p>
                  On iPhone, use Safari’s Share menu, then Add to Home Screen.
                  On Android, open the browser menu and choose Install app or
                  Add to Home Screen when available.
                </p>
              </details>
            )}
          </section>
        </div>
      </div>
      <section className="privacy-card mt-6">
        <Icon name="shield" />
        <div>
          <h2>Camera privacy</h2>
          <p>
            This preview does not upload or store camera footage. Only your
            camera preferences are saved on this device. Account and
            session-data controls will be added with those features.
          </p>
        </div>
      </section>
    </>
  );
}
