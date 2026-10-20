import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { resetPassword, verifyEmail } from "../features/auth/api";
import { useAuth } from "../features/auth/AuthProvider";

interface EmailAccessLinkProps {
  kind: "verify-email" | "reset-password";
  token: string;
  openAccount: () => void;
}

export function EmailAccessLink({ kind, token, openAccount }: EmailAccessLinkProps) {
  const { refresh } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const verificationMutation = useMutation({ mutationFn: verifyEmail, gcTime: 0 });
  const resetMutation = useMutation({ mutationFn: ({ token: resetToken, password }: { token: string; password: string }) => resetPassword(resetToken, password), gcTime: 0 });
  const pending = verificationMutation.isPending || resetMutation.isPending;

  const confirmVerification = async () => {
    verificationMutation.reset();
    setError("");
    setMessage("");

    try {
      await verificationMutation.mutateAsync(token);
      await refresh();
      setMessage(
        "Your email address is verified. Sign in if you are not already signed in.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "This verification link could not be confirmed.",
      );
    } finally {
      verificationMutation.reset();
    }
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    setError("");
    setMessage("");
    if (newPassword !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    resetMutation.reset();
    try {
      await resetMutation.mutateAsync({ token, password: newPassword });
      form.reset();
      await refresh();
      setMessage(
        "Your password was reset and your previous sessions were signed out. Sign in with your new password.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "This reset link could not be used.",
      );
    } finally {
      resetMutation.reset();
    }
  };

  const isVerification = kind === "verify-email";

  return (
    <section className="max-w-120 m-auto bg-surface border border-[#ffffff08] rounded-[20px] p-6.25 sm:p-8">
      <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium">
        {isVerification ? "Confirm your email" : "Choose a new password"}
      </h1>
      <p className="text-muted text-sm leading-[1.75] mt-3">
        {isVerification
          ? "Confirm this action to verify the email address on the link."
          : "Use a new password between 12 and 128 characters."}
      </p>

      {!token ? (
        <p role="alert" className="mt-5 text-sm text-accent">
          This link is missing its token. Request a new link and try again.
        </p>
      ) : message ? (
        <div className="mt-5">
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
          {!isVerification && (
            <button
              type="button"
              className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] mt-5"
              onClick={openAccount}
            >
              Sign in
            </button>
          )}
        </div>
      ) : (
        <>
          {isVerification ? (
            <button
              type="button"
              disabled={pending}
              className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] mt-6"
              onClick={() => void confirmVerification()}
            >
              {pending ? "Please wait…" : "Confirm email"}
            </button>
          ) : (
            <form
              className="grid gap-4 mt-6"
              onSubmit={(event) => void submitReset(event)}
            >
              <label className="grid gap-[9px] text-xs text-[#c6cbbd]">
                New password
                <input
                  disabled={pending}
                  className="w-full bg-[#272c22] p-3.5 rounded-[9px] border border-[#ffffff17] text-base text-foreground"
                  required
                  name="newPassword"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
              <label className="grid gap-[9px] text-xs text-[#c6cbbd]">
                Confirm new password
                <input
                  disabled={pending}
                  className="w-full bg-[#272c22] p-3.5 rounded-[9px] border border-[#ffffff17] text-base text-foreground"
                  required
                  name="confirmation"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
              <button
                disabled={pending}
                className="flex items-center justify-center min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b]"
              >
                {pending ? "Please wait…" : "Reset password"}
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-accent">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
