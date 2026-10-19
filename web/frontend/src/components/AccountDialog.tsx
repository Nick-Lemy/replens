import { useEffect, useRef, useState } from "react";
import { useAuth } from "../features/auth/AuthProvider";
import { Icon } from "./Icon";

export function AccountDialog({ close, returnFocus }: { close: () => void; returnFocus: HTMLElement | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const { authenticate, pending, error } = useAuth();
  const [attempted, setAttempted] = useState(false);
  useEffect(() => {
    const previous = returnFocus;
    ref.current?.showModal();
    return () => { queueMicrotask(() => previous?.focus()); };
  }, [returnFocus]);
  return (
    <dialog
      ref={ref}
      className="fixed inset-0 m-auto py-[35px] px-6.5 bg-[#1b1f18] text-foreground border border-[#ffffff1c] rounded-3xl w-[min(440px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_32px)] overflow-y-auto backdrop:bg-[#000b] backdrop:backdrop-blur-[6px]"
      onCancel={close}
      onClick={(event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (
          rect &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          close();
      }}
      aria-labelledby="account-title"
    >
      <button
        className="size-11 inline-flex items-center justify-center bg-[#ffffff06] border border-[#ffffff1a] rounded-full absolute right-5 top-5"
        aria-label="Close account form"
        onClick={close}
      >
        <Icon className="size-[19px]" name="close" />
      </button>
      <div className="size-6 inline-flex items-center gap-[3px] mr-2.5">
        <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-[23px] nth-3:h-[17px]" />
        <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-[23px] nth-3:h-[17px]" />
        <span className="block w-1 h-3 bg-accent rounded-xs nth-2:h-[23px] nth-3:h-[17px]" />
      </div>
      <h2 id="account-title" className="text-[clamp(28px,_4vw,_34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-2">
        {mode === "signin" ? "Welcome back." : "Make it yours."}
      </h2>
      <p className="text-muted text-sm leading-[1.75] mt-3">
        Create an account or sign in to RepLens. Session saving will be added later.
      </p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          const form = new FormData(event.currentTarget);
          setAttempted(true);
          const success = await authenticate(mode, {
            ...(mode === "signup" ? { name: String(form.get("name") ?? "").trim() } : {}),
            email: String(form.get("email") ?? "").trim(),
            password: String(form.get("password") ?? ""),
          });
          if (success) close();
        }}
      >
        {mode === "signup" && (
          <label className="grid gap-[9px] text-xs text-[#c6cbbd]">
            Name
            <input disabled={pending} className="w-full bg-[#272c22] p-3.5 rounded-[9px] border border-[#ffffff17] text-base text-foreground placeholder:text-[#859078]" required name="name" maxLength={80} pattern={".*\\S.*"} autoComplete="name" placeholder="Your name" />
          </label>
        )}
        <label className="grid gap-[9px] text-xs text-[#c6cbbd]">
          Email
          <input disabled={pending} className="w-full bg-[#272c22] p-3.5 rounded-[9px] border border-[#ffffff17] text-base text-foreground placeholder:text-[#859078]"
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label className="grid gap-[9px] text-xs text-[#c6cbbd]">
          Password
          <input disabled={pending} className="w-full bg-[#272c22] p-3.5 rounded-[9px] border border-[#ffffff17] text-base text-foreground placeholder:text-[#859078]"
            required
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder="12–128 characters"
          />
        </label>
        {attempted && error && (
          <p className="bg-[#f2b85b0a] text-[#c6cbbd] py-[13px] px-[15px] rounded-[9px] text-xs leading-[1.7] border-l-2 border-l-[#a98546]" role="alert">
            {error}
          </p>
        )}
        <button disabled={pending} className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b]">
          {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        className="text-[#c9d0bf] text-xs p-2.5 underline-offset-4 hover:underline mt-6 w-full"
        disabled={pending}
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setAttempted(false);
        }}
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </dialog>
  );
}
