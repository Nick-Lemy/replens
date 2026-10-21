import { ApiError, isRecord, isNonEmptyString, requestJson } from "../api/client";

export { ApiError as AccountError };

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  accountDeletion: { requiresPassword: boolean; recentSessionAllowed: boolean };
}

export interface AuthProviderAvailability {
  emailPasswordEnabled: boolean;
  socialProviders: string[];
}

function parseAccountUser(value: unknown): AccountUser | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const user = value.user;
  const deletion = value.accountDeletion;
  if (!isNonEmptyString(user.id) || !isNonEmptyString(user.name) || !isNonEmptyString(user.email)) return null;
  if (typeof user.emailVerified !== "boolean") return null;
  if (typeof user.createdAt !== "string" || typeof user.updatedAt !== "string") return null;
  if (deletion === undefined) return { ...user, accountDeletion: { requiresPassword: true, recentSessionAllowed: false } } as unknown as AccountUser;
  if (!isRecord(deletion) || typeof deletion.requiresPassword !== "boolean" || typeof deletion.recentSessionAllowed !== "boolean") return null;
  return { ...user, accountDeletion: deletion } as unknown as AccountUser;
}

const privateRequest = { credentials: "include", cache: "no-store" } as const;

export async function currentUser(signalOrTimeout?: AbortSignal | number): Promise<AccountUser | null> {
  const signal = typeof signalOrTimeout === "number" ? undefined : signalOrTimeout;
  const timeoutMs = typeof signalOrTimeout === "number" ? signalOrTimeout : 15_000;
  try {
    const result = await requestJson("/api/me", { ...privateRequest, signal, timeoutMs });
    const user = parseAccountUser(result);
    if (!user) throw new ApiError("Account services returned an invalid response.");
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function getAuthProviderAvailability(signal?: AbortSignal): Promise<AuthProviderAvailability> {
  const result = await requestJson("/api/auth/providers", { ...privateRequest, signal });
  if (!isRecord(result) || typeof result.emailPasswordEnabled !== "boolean" || !Array.isArray(result.socialProviders) || !result.socialProviders.every((provider) => typeof provider === "string")) {
    throw new ApiError("Authentication services returned an invalid response.");
  }
  return { emailPasswordEnabled: result.emailPasswordEnabled, socialProviders: result.socialProviders.filter((provider) => provider === "google") };
}

export async function beginGoogleSignIn(callbackURL: string, errorCallbackURL: string): Promise<string> {
  const result = await requestJson("/api/auth/sign-in/social", {
    ...privateRequest,
    method: "POST",
    body: { provider: "google", callbackURL, errorCallbackURL, disableRedirect: true },
  });
  if (!isRecord(result) || typeof result.url !== "string") throw new ApiError("Google sign-in returned an invalid response.");
  let target: URL;
  try { target = new URL(result.url); } catch { throw new ApiError("Google sign-in returned an invalid response."); }
  if (target.protocol !== "https:" || target.origin !== "https://accounts.google.com" || target.username || target.password || !target.pathname.startsWith("/o/oauth2/")) {
    throw new ApiError("Google sign-in returned an untrusted destination.");
  }
  return target.href;
}

export async function submitAccount(
  mode: "signin" | "signup",
  details: { name?: string; email: string; password: string },
) {
  await requestJson(`/api/auth/${mode === "signup" ? "sign-up" : "sign-in"}/email`, {
    ...privateRequest,
    method: "POST",
    body: details,
    expect: "none",
  });
}

export async function endAccountSession() {
  await requestJson("/api/auth/sign-out", { ...privateRequest, method: "POST", body: {}, expect: "none" });
}

export async function requestPasswordReset(email: string) {
  await requestJson("/api/auth/request-password-reset", { ...privateRequest, method: "POST", body: { email }, expect: "none" });
}

export async function sendVerificationEmail(email: string) {
  await requestJson("/api/auth/send-verification-email", { ...privateRequest, method: "POST", body: { email }, expect: "none" });
}

export async function verifyEmail(token: string) {
  await requestJson(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { ...privateRequest, expect: "none" });
}

export async function resetPassword(token: string, newPassword: string) {
  await requestJson("/api/auth/reset-password", { ...privateRequest, method: "POST", body: { token, newPassword }, expect: "none" });
}

export async function updateAccountName(name: string) {
  await requestJson("/api/auth/update-user", { ...privateRequest, method: "POST", body: { name }, expect: "none" });
}

export async function deleteAccount(password?: string) {
  await requestJson("/api/auth/delete-user", { ...privateRequest, method: "POST", body: password === undefined ? {} : { password }, expect: "none" });
}
