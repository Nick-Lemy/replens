import { useState, type FormEvent } from "react";
import { AccountError, updateAccountName, type AccountUser } from "../auth/api";

export function ProfileNameEditor({ user, refresh, disabled = false }: {
  user: AccountUser;
  refresh: () => Promise<void>;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || disabled) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    setPending(true);
    setError("");
    setNotice("");
    try {
      await updateAccountName(name);
      await refresh();
      setEditing(false);
      setNotice("Name saved.");
    } catch (failure) {
      if (failure instanceof AccountError && failure.status === 401) {
        await refresh();
        return;
      }
      setError(failure instanceof Error ? failure.message : "Your name could not be updated. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (editing) {
    return (
      <form className="mt-5 grid gap-3" onSubmit={(event) => void saveName(event)}>
        <label className="grid gap-[9px] text-xs text-[#c6cbbd]">
          Display name
          <input
            className="w-full bg-[#272c22] p-3.5 rounded-[9px] border border-[#ffffff17] text-base text-foreground placeholder:text-[#859078]"
            name="name"
            defaultValue={user.name}
            autoComplete="name"
            minLength={1}
            maxLength={80}
            pattern={".*\\S.*"}
            required
            disabled={pending || disabled}
            aria-describedby={error ? "profile-name-error" : undefined}
          />
        </label>
        {error && <p id="profile-name-error" role="alert" className="text-xs text-accent">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending || disabled}
            className="flex flex-1 items-center justify-center min-h-11 rounded-xl px-4 text-xs font-semibold bg-accent text-[#22281b] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save name"}
          </button>
          <button
            type="button"
            disabled={pending || disabled}
            className="flex flex-1 items-center justify-center min-h-11 rounded-xl px-4 text-xs border border-[#ffffff26] disabled:opacity-60"
            onClick={() => { setEditing(false); setError(""); }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={disabled}
        className="min-h-11 text-xs text-accent underline underline-offset-4 disabled:opacity-60"
        onClick={() => { setNotice(""); setError(""); setEditing(true); }}
      >
        Edit display name
      </button>
      {notice && <p role="status" className="mt-2 text-xs text-muted">{notice}</p>}
    </div>
  );
}
