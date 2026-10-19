import { useState } from "react";
import { sendVerificationEmail } from "./api";

export function EmailVerification({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const requestVerification = async () => {
    setPending(true);
    setNotice("");
    setError("");

    try {
      await sendVerificationEmail(email);
      setNotice("Verification email requested. Check your inbox.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Verification email is unavailable. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-4">
      <p className="text-xs text-muted">
        Email status: <span className="text-foreground">Not verified</span>
      </p>
      <button
        type="button"
        disabled={pending}
        className="mt-3 min-h-11 text-xs text-accent underline underline-offset-4 disabled:opacity-60"
        onClick={() => void requestVerification()}
      >
        {pending ? "Please wait…" : "Send verification email"}
      </button>
      {notice && (
        <p role="status" className="mt-2 text-xs text-muted">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
