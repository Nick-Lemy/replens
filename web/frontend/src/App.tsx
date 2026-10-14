import { useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { AccountDialog } from "./components/AccountDialog";
import { Home } from "./pages/Home";
import { Guide } from "./pages/Guide";
import { Live } from "./pages/Live";
import { History } from "./pages/History";
import { Profile, type Preferences } from "./pages/Profile";
import { useInstall } from "./hooks/useInstall";

const navigation: { id: string; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "guide", label: "Guide", icon: "guide" },
  { id: "live", label: "Live", icon: "camera" },
  { id: "history", label: "History", icon: "history" },
  { id: "profile", label: "Profile", icon: "user" },
];
function readRoute() {
  const hash = window.location.hash.slice(1).split("/")[0];
  return navigation.some((item) => item.id === hash) ? hash : "home";
}
function readPreferences(): Preferences {
  try {
    const value = JSON.parse(
      localStorage.getItem("replens.preferences") ?? "{}",
    ) as Partial<Preferences>;
    return {
      facing: value?.facing === "environment" ? "environment" : "user",
      countdown: [3, 5, 10].includes(value?.countdown ?? 0)
        ? value.countdown!
        : 5,
    };
  } catch {
    return { facing: "user", countdown: 5 };
  }
}

export function App() {
  const [route, setRoute] = useState(readRoute);
  const [accountOpen, setAccountOpen] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const [offline, setOffline] = useState(!navigator.onLine);
  const installer = useInstall();

  useEffect(() => {
    const changed = () => {
      setRoute(readRoute());
      setAccountOpen(false);
      window.scrollTo(0, 0);
    };
    const connected = () => setOffline(!navigator.onLine);
    window.addEventListener("hashchange", changed);
    window.addEventListener("online", connected);
    window.addEventListener("offline", connected);
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", connected);
    };
  }, []);
  useEffect(() => {
    document.title = `${navigation.find((item) => item.id === route)?.label ?? "Home"} · RepLens`;
  }, [route]);

  const updatePreferences = (next: Preferences) => {
    setPreferences(next);
    try {
      localStorage.setItem("replens.preferences", JSON.stringify(next));
    } catch {
      /* Preferences still work for this visit. */
    }
  };
  const openAccount = () => setAccountOpen(true);
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="desktop-sidebar">
        <a className="brand" href="#home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          replens<span className="brand-dot">.</span>
        </a>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={route === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} />
              {item.label === "Live" ? "Live session" : item.label}
              <span className="nav-indicator" />
            </a>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <a className="brand" href="#home">
            <span className="brand-mark">
              <span />
              <span />
              <span />
            </span>
            replens<span className="brand-dot">.</span>
          </a>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Open account setup"
              onClick={openAccount}
            >
              <Icon name="user" />
            </button>
          </div>
        </header>
        {offline && (
          <div className="offline-banner" role="status">
            You’re offline. Previously loaded guides and camera preview remain
            available.
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="page-content"
          key={route}
        >
          {route === "home" && <Home />}
          {route === "guide" && <Guide />}
          {route === "live" && (
            <Live
              initialFacing={preferences.facing}
              countdownSeconds={preferences.countdown}
            />
          )}
          {route === "history" && <History openAccount={openAccount} />}
          {route === "profile" && (
            <Profile
              preferences={preferences}
              update={updatePreferences}
              openAccount={openAccount}
              install={installer.install}
              canInstall={installer.canPrompt}
              installed={installer.installed}
            />
          )}
        </main>
        <nav className="mobile-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={route === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
      {accountOpen && <AccountDialog close={() => setAccountOpen(false)} />}
    </div>
  );
}
