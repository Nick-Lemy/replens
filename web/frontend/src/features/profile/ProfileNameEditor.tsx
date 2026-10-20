import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AccountError, updateAccountName, type AccountUser } from "../auth/api";

export function ProfileNameEditor({ user, refresh, disabled = false }: {
  user: AccountUser;
  refresh: () => Promise<void>;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const mutation = useMutation({
    mutationFn: async (name: string) => {
      try {
        await updateAccountName(name);
        await refresh();
      } catch (failure) {
        if (failure instanceof AccountError && failure.status === 401) await refresh();
        throw failure;
      }
    },
    gcTime: 0,
  });
  const pending = mutation.isPending;
  const error = mutation.error?.message ?? "";

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || disabled) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    mutation.reset();
    setNotice("");
    try {
      await mutation.mutateAsync(name);
      setEditing(false);
      setNotice("Name saved.");
    } catch (failure) {
      if (failure instanceof AccountError && failure.status === 401) return;
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
            onClick={() => { setEditing(false); mutation.reset(); }}
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
        onClick={() => { setNotice(""); mutation.reset(); setEditing(true); }}
      >
        Edit display name
      </button>
      {notice && <p role="status" className="mt-2 text-xs text-muted">{notice}</p>}
    </div>
  );
}
