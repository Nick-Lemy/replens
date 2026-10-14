import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export function AccountDialog({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="account-dialog"
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
        className="icon-button dialog-close"
        aria-label="Close account form"
        onClick={close}
      >
        <Icon name="close" />
      </button>
      <div className="brand-mark">
        <span />
        <span />
        <span />
      </div>
      <h2 id="account-title" className="page-title mt-2">
        {mode === "signin" ? "Welcome back." : "Make it yours."}
      </h2>
      <p className="description mt-3">
        Save your sessions and keep your progress in one place.
      </p>
      <p className="notice mt-6">
        Accounts are not connected in this preview. Your details will not be
        submitted or saved.
      </p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(
            "Account access will be available when authentication is connected.",
          );
        }}
      >
        {mode === "signup" && (
          <label className="field-label">
            Name
            <input required autoComplete="name" placeholder="Your name" />
          </label>
        )}
        <label className="field-label">
          Email
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label className="field-label">
          Password
          <input
            required
            type="password"
            minLength={8}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder="At least 8 characters"
          />
        </label>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <button className="primary-button">
          {mode === "signin" ? "Sign in" : "Create account"}
          <Icon name="arrow" />
        </button>
      </form>
      <button
        className="text-button mt-6 w-full"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage("");
        }}
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </dialog>
  );
}
