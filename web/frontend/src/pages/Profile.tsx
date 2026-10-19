import type { MouseEvent } from "react";
import { useAuth } from "../features/auth/AuthProvider";
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
  openAccount: (event?: MouseEvent<HTMLButtonElement>) => void;
  install: () => Promise<void>;
  canInstall: boolean;
  installed: boolean;
}) {
  const { user, status, pending, error, refresh, signOut } = useAuth();
  return (
    <>
      <div className="mb-7 lg:mb-8">
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">
          Profile
        </h1>
      </div>
      <div className="grid gap-5 sm:grid-cols-[0.9fr_1.1fr] sm:gap-7">
        <section className="bg-surface border border-[#ffffff08] rounded-[20px] p-6.25">
          <div className="grid place-items-center size-15.5 rounded-full bg-[#d5dac5] text-[#313b29]">
            <Icon className="size-7" name="user" />
          </div>
          <h2 className="break-words font-medium text-[22px] tracking-[-0.035em] leading-[1.18] mt-5">
            {user?.name ?? (status === "loading" ? "Checking account…" : status === "unavailable" ? "Account unavailable" : "Guest account")}
          </h2>
          <p className="break-all text-muted text-sm leading-[1.75] mt-3">
            {user ? user.email : "Sign in or create your RepLens account."}
          </p>
          <button
            className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] mt-6"
            disabled={pending || status === "loading"}
            onClick={(event) => { if (user) void signOut(); else if (status === "unavailable") void refresh(); else openAccount(event); }}
          >
            {pending ? "Please wait…" : user ? "Sign out" : status === "unavailable" ? "Retry account connection" : "Sign in or create account"}
          </button>
          {error && <p role="alert" className="mt-4 text-sm text-accent">{error}</p>}
        </section>
        <div className="grid gap-5">
          <section className="bg-surface border border-[#ffffff08] rounded-[20px] p-6.25">
            <h2 className="font-semibold">Camera preferences</h2>
            <label className="flex items-center justify-between gap-3 text-xs mt-5">
              <span>Preferred camera</span>
              <select
                className="text-[#d7e0cd] bg-[#30352b] p-2.5 rounded-lg max-w-37.5"
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
            <label className="flex items-center justify-between gap-3 text-xs mt-5">
              <span>Preview countdown</span>
              <select
                className="text-[#d7e0cd] bg-[#30352b] p-2.5 rounded-lg max-w-37.5"
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
          <section className="bg-surface border border-[#ffffff08] rounded-[20px] p-6.25">
            <h2 className="font-medium text-[22px] tracking-[-0.035em] leading-[1.18]">
              Add to home screen
            </h2>
            <p className="text-muted text-sm leading-[1.75] mt-3">
              Add RepLens to your home screen for an app-like experience.
            </p>
            {installed ? (
              <p className="inline-flex items-center gap-3.5 text-xs font-semibold text-accent mt-4">
                <Icon className="size-4.5" name="check" />
                You’re using the installed app
              </p>
            ) : canInstall ? (
              <button
                className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full border border-[#ffffff26] bg-[#ffffff03] mt-5"
                onClick={() => {
                  void install();
                }}
              >
                Install RepLens
                <Icon className="size-4.75" name="download" />
              </button>
            ) : (
              <details className="mt-4">
                <summary className="text-xs text-accent py-2.25 px-0">
                  How to add to home screen
                </summary>
                <p className="text-xs leading-[1.8] text-muted mt-2">
                  On iPhone, use Safari’s Share menu, then Add to Home Screen.
                  On Android, open the browser menu and choose Install app or
                  Add to Home Screen when available.
                </p>
              </details>
            )}
          </section>
        </div>
      </div>
      <section className="flex items-start gap-4 p-6.25 border border-[#ffffff15] rounded-[18px] mt-6">
        <Icon className="size-6 text-[#b6c0aa]" name="shield" />
        <div>
          <h2 className="text-sm font-medium">Camera privacy</h2>
          <p className="text-xs leading-[1.8] text-muted mt-2.25">
            This preview does not upload or store camera footage. Only your
            camera preferences are saved on this device. Accounts use a secure session cookie. Saved session data and account-deletion controls are not available yet.
          </p>
        </div>
      </section>
    </>
  );
}
