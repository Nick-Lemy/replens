export function consumeGoogleAuthNotice(): string {
  const hashParts = window.location.hash.slice(1).split("?");
  const hashPath = hashParts.shift() ?? "";
  const hashParams = new URLSearchParams(hashParts.join("?"));
  const searchParams = new URLSearchParams(window.location.search);
  const callbackError = searchParams.get("error") ?? hashParams.get("error");
  const failedFlag = searchParams.has("google-auth-error") || hashParams.has("google-auth-error");
  const notice = callbackError === "account_not_linked"
    ? "Sign in with your email and password and verify your email before using Google for this account."
    : callbackError === "access_denied" || callbackError === "user_cancelled" || callbackError === "cancelled"
      ? "Google sign-in was cancelled. You can continue with email or try Google again."
      : callbackError || failedFlag ? "Google sign-in could not be completed. Please try again or use email sign-in." : "";
  if (callbackError || failedFlag || searchParams.has("error_description") || searchParams.has("code") || searchParams.has("state") || hashParams.has("error_description") || hashParams.has("code") || hashParams.has("state")) {
    for (const name of ["error", "error_description", "google-auth-error", "code", "state"]) {
      searchParams.delete(name);
      hashParams.delete(name);
    }
    const query = hashParams.toString();
    const nextHash = hashPath ? `#${hashPath}${query ? `?${query}` : ""}` : "";
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${searchParams.toString() ? `?${searchParams}` : ""}${nextHash}`);
  }
  return notice;
}
