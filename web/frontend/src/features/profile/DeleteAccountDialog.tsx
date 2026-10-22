import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AccountError, deleteAccount } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";

export function DeleteAccountDialog({ refresh, disabled = false }: {
  refresh: () => Promise<void>;
  disabled?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  const { user, authenticateGoogle, googleAvailable, googlePending } = useAuth();
  const capability = user?.accountDeletion;
  const passwordRequired = capability?.requiresPassword ?? true;
  const mutation = useMutation({
    mutationFn: async (password: string | undefined) => {
      try {
        await deleteAccount(password);
        await refresh();
      } catch (failure) {
        if (failure instanceof AccountError && failure.status === 401) await refresh();
        throw failure;
      }
    },
    gcTime: 0,
  });
  const pending = mutation.isPending || googlePending;

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?").slice(1).join("?"));
    if (params.get("confirm-delete") === "1") {
      setOpen(true);
      setReauthRequired(Boolean(capability && !capability.requiresPassword && !capability.recentSessionAllowed));
      params.delete("confirm-delete");
      const query = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#profile${query ? `?${query}` : ""}`);
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  const close = () => {
    if (pending) return;
    formRef.current?.reset();
    setOpen(false);
    setError("");
    setReauthRequired(false);
  };

  const confirmDeletion = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (pending || disabled) return;
    const form = event?.currentTarget ?? formRef.current;
    const password = passwordRequired ? String(form ? new FormData(form).get("password") ?? "" : "") : undefined;
    mutation.reset();
    setError("");

    try {
      await mutation.mutateAsync(password);
      form?.reset();
      setOpen(false);
    } catch (failure) {
      form?.reset();
      if (failure instanceof AccountError && failure.status === 401) {
        return;
      }
      if (failure instanceof AccountError && failure.code === "SESSION_EXPIRED") {
        setReauthRequired(true);
        setError("Your Google sign-in needs refreshing. Confirm deletion again after signing in.");
        return;
      }
      setError(failure instanceof Error ? failure.message : "Your account could not be deleted. Please try again.");
    } finally {
      mutation.reset();
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className="min-h-11 text-xs text-danger-text underline underline-offset-4 disabled:opacity-60"
        onClick={(event) => {
          returnFocusRef.current = event.currentTarget;
          setError("");
          setReauthRequired(Boolean(capability && !capability.requiresPassword && !capability.recentSessionAllowed));
          setOpen(true);
        }}
      >
        Delete account
      </button>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto p-6 bg-surface text-foreground border border-line rounded-3xl w-[min(440px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_32px)] overflow-y-auto backdrop:bg-[#000b] backdrop:backdrop-blur-[6px]"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          formRef.current?.reset();
          setOpen(false);
          queueMicrotask(() => returnFocusRef.current?.focus());
        }}
        onClick={(event) => {
          const rect = dialogRef.current?.getBoundingClientRect();
          if (rect && (
            event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom
          )) close();
        }}
      >
        <h2 id="delete-account-title" className="text-[26px] leading-tight tracking-[-0.04em] font-medium">
          Delete your account?
        </h2>
        <p id="delete-account-description" className="text-muted text-sm leading-[1.75] mt-3">
          This permanently deletes your RepLens account, profile, active sign-ins and saved session summaries. {passwordRequired ? "Enter your current password to confirm." : "Review and confirm below. You will be asked to sign in with Google again if your session is no longer recent."}
        </p>
        {passwordRequired && <form ref={formRef} className="grid gap-4 mt-6" onSubmit={(event) => void confirmDeletion(event)}>
          <label className="grid gap-[9px] text-xs text-secondary">
            Current password
            <input
              className="w-full bg-input p-3.5 rounded-[9px] border border-line text-base text-foreground"
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
              autoFocus
              disabled={pending}
            />
          </label>
          {error && <p role="alert" className="text-xs leading-[1.7] text-accent">{error}</p>}
          <button
            type="submit"
            disabled={pending || disabled || !capability}
            className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-danger text-white disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Permanently delete account"}
          </button>
          <button
            type="button"
            disabled={pending}
            className="flex items-center justify-center min-h-11 rounded-xl px-5 text-xs border border-line disabled:opacity-60"
            onClick={close}
          >
            Cancel
          </button>
        </form>}
        {!passwordRequired && <div className="grid gap-4 mt-6">
          {!capability && <p role="alert" className="text-xs leading-[1.7] text-accent">Deletion confirmation is unavailable. Refresh your profile and try again.</p>}
          {error && <p role="alert" className="text-xs leading-[1.7] text-accent">{error}</p>}
          {reauthRequired && googleAvailable && <button type="button" disabled={pending || disabled} className="min-h-12 rounded-xl border border-line bg-control text-sm font-medium disabled:opacity-60" onClick={() => void authenticateGoogle("confirm-delete")}>{googlePending ? "Connecting…" : "Continue with Google"}</button>}
          {reauthRequired && !googleAvailable && <p className="text-xs leading-[1.7] text-muted">Google sign-in is unavailable right now. You can close this dialog and try again later.</p>}
          <button type="button" disabled={pending || disabled || !capability || reauthRequired || !capability.recentSessionAllowed} className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-danger text-white disabled:opacity-60" onClick={() => void confirmDeletion()}>
            {pending ? "Deleting…" : "Permanently delete account"}
          </button>
          <button type="button" disabled={pending} className="flex items-center justify-center min-h-11 rounded-xl px-5 text-xs border border-line disabled:opacity-60" onClick={close}>Cancel</button>
        </div>}
      </dialog>
    </>
  );
}
