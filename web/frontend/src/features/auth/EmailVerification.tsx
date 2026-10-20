import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendVerificationEmail } from "./api";

export function EmailVerification({ email }: { email: string }) {
  const [notice, setNotice] = useState("");
  const mutation = useMutation({ mutationFn: sendVerificationEmail, gcTime: 0 });
  const pending = mutation.isPending;

  const requestVerification = async () => {
    mutation.reset();
    setNotice("");

    try {
      await mutation.mutateAsync(email);
      setNotice("Verification email requested. Check your inbox.");
    } catch {}
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
      {mutation.error && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
