import { ApiError, isRecord, isNonEmptyString, requestJson } from "../api/client";

export { ApiError as AccountError };

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

function parseAccountUser(value: unknown): AccountUser | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const user = value.user;
  if (!isNonEmptyString(user.id) || !isNonEmptyString(user.name) || !isNonEmptyString(user.email)) return null;
  if (typeof user.emailVerified !== "boolean") return null;
  if (typeof user.createdAt !== "string" || typeof user.updatedAt !== "string") return null;
  return user as unknown as AccountUser;
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

export async function deleteAccount(password: string) {
  await requestJson("/api/auth/delete-user", { ...privateRequest, method: "POST", body: { password }, expect: "none" });
}
