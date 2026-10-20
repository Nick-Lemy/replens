import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Icon, type IconName } from "./components/Icon";
import { AccountDialog } from "./components/AccountDialog";
import { Home } from "./pages/Home";
import { Guide } from "./pages/Guide";
import { Live } from "./pages/Live";
import { History } from "./pages/History";
import { Profile, type Preferences } from "./pages/Profile";
import { useAuth } from "./features/auth/AuthProvider";
import { useInstall } from "./hooks/useInstall";
import { EmailAccessLink } from "./pages/EmailAccessLink";

const navigation: { id: string; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "guide", label: "Guide", icon: "guide" },
  { id: "live", label: "Live", icon: "camera" },
  { id: "history", label: "History", icon: "history" },
  { id: "profile", label: "Profile", icon: "user" },
];
type Route = "home" | "guide" | "live" | "history" | "profile" | "verify-email" | "reset-password";
function consumeRoute(rawHash: string): { route: Route; token: string } {
  const [rawPath, query = ""] = rawHash.slice(1).split("?", 2);
  const route = rawPath.split("/")[0];
  if (route === "verify-email" || route === "reset-password") {
    const token = new URLSearchParams(query).get("token") ?? "";
    if (query) window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${route}`);
    return { route, token };
  }
  return { route: navigation.some((item) => item.id === route) ? route as Route : "home", token: "" };
}
const initialLink = consumeRoute(window.location.hash);
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
  const [route, setRoute] = useState<Route>(initialLink.route);
  const [linkToken, setLinkToken] = useState(initialLink.token);
  const accountTrigger = useRef<HTMLElement | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const [offline, setOffline] = useState(!navigator.onLine);
  const installer = useInstall();
  const { user, status, error, refresh } = useAuth();

  useEffect(() => {
    const changed = () => {
      const next = consumeRoute(window.location.hash);
      setRoute(next.route);
      setLinkToken(next.token);
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
    document.title = `${navigation.find((item) => item.id === route)?.label ?? (route === "verify-email" ? "Confirm email" : route === "reset-password" ? "Reset password" : "Home")} · RepLens`;
  }, [route]);

  const updatePreferences = (next: Preferences) => {
    setPreferences(next);
    try {
      localStorage.setItem("replens.preferences", JSON.stringify(next));
    } catch {
      /* Preferences still work for this visit. */
    }
  };
  const openAccount = (event?: MouseEvent<HTMLButtonElement>) => {
    accountTrigger.current = event?.currentTarget ?? document.activeElement as HTMLElement;
    setAccountOpen(true);
  };
  return (
    <div className="max-w-400 m-auto min-h-dvh lg:grid lg:grid-cols-[225px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed -top-25 left-2.5 z-50 p-3 bg-accent text-background focus:top-2.5"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="hidden lg:flex lg:flex-col lg:py-9.75 lg:px-6.75 lg:border-r lg:border-r-[#ffffff0f] lg:sticky lg:top-0 lg:h-dvh">
        <a
          className="inline-flex items-center text-[25px] font-bold tracking-[-1.2px]"
          href="#home"
        >
          <span className="size-6 inline-flex items-center gap-0.75 mr-2.5">
            <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-5.75 nth-3:h-4.25" />
            <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-5.75 nth-3:h-4.25" />
            <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-5.75 nth-3:h-4.25" />
          </span>
          replens<span className="text-accent">.</span>
        </a>
        <nav
          className="lg:grid lg:gap-2 lg:mt-12.5"
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <a
              className="group lg:min-h-12 lg:p-3.25 lg:rounded-[10px] lg:text-xs lg:flex lg:items-center lg:gap-3.25 lg:text-muted lg:aria-[current=page]:bg-[#f2b85b12] lg:aria-[current=page]:text-accent"
              key={item.id}
              href={`#${item.id}`}
              aria-current={route === item.id ? "page" : undefined}
            >
              <Icon className="lg:w-4.5 lg:h-4.5" name={item.icon} />
              {item.label === "Live" ? "Live session" : item.label}
              <span className="lg:w-1 lg:h-1 lg:rounded-full lg:ml-auto group-aria-[current=page]:bg-accent" />
            </a>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between py-4.5 px-5 pt-[max(18px,env(safe-area-inset-top))] border-b-0 sm:px-9 lg:py-7 xl:px-14">
          <a
            className="inline-flex items-center text-[25px] font-bold tracking-[-1.2px] lg:invisible"
            href="#home"
          >
            <span className="size-6 inline-flex items-center gap-0.75 mr-2.5">
              <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-5.75 nth-3:h-4.25" />
              <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-5.75 nth-3:h-4.25" />
              <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-5.75 nth-3:h-4.25" />
            </span>
            replens<span className="text-accent">.</span>
          </a>
          <div className="flex items-center gap-3.5">
            <button
              className="size-11 inline-flex items-center justify-center bg-[#ffffff06] border border-[#ffffff1a] rounded-full"
              aria-label={user ? "Open profile" : "Open account setup"}
              onClick={(event) => { if (user) window.location.hash = "profile"; else openAccount(event); }}
            >
              <Icon className="size-4.75" name="user" />
            </button>
          </div>
        </header>
        {offline && (
          <div
            className="py-3 px-5.5 text-xs bg-[#f2b85b17] text-[#d8c59f]"
            role="status"
          >
            You’re offline. Previously loaded guides and camera preview remain
            available.
          </div>
        )}
        {status === "unavailable" && (
          <div role="status" className="flex flex-wrap items-center gap-3 py-3 px-5 text-xs text-accent">
            <span>{error}</span>
            <button className="underline underline-offset-4 p-2" onClick={() => void refresh()}>Retry connection</button>
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="p-[22px_20px_calc(100px+env(safe-area-inset-bottom))] max-w-300 m-auto outline-none sm:pt-10 sm:px-9 sm:pb-28 lg:pt-10.5 lg:px-9 lg:pb-11.25 xl:px-14"
          key={route}
        >
          {route === "home" && <Home />}
          {route === "guide" && <Guide />}
          {route === "live" && (
            <Live
              initialFacing={preferences.facing}
              countdownSeconds={preferences.countdown}
              openAccount={() => openAccount()}
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
          {(route === "verify-email" || route === "reset-password") && <EmailAccessLink key={`${route}:${linkToken}`} kind={route} token={linkToken} openAccount={() => openAccount()} />}
        </main>
        <nav
          className="fixed bottom-0 left-0 right-0 z-10 flex bg-[#1b1e1af5] border-t border-t-[#ffffff10] p-[13px_12px_calc(13px+env(safe-area-inset-bottom))] backdrop-blur-lg lg:hidden"
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <a
              className="min-h-11 flex flex-1 flex-col items-center justify-center gap-1.75 text-[#959d8e] aria-[current=page]:text-accent"
              key={item.id}
              href={`#${item.id}`}
              aria-current={route === item.id ? "page" : undefined}
            >
              <Icon className="size-5.25" name={item.icon} />
              <span className="text-[10px]">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
      {accountOpen && <AccountDialog close={() => setAccountOpen(false)} returnFocus={accountTrigger.current} />}
    </div>
  );
}
