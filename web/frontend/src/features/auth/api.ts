export interface AccountUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AccountError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

async function request(path: string, body?: object, timeoutMs = 15_000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`/api/${path}`, {
      signal: controller.signal,
      method: body ? "POST" : "GET",
      credentials: "include",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      await response.body?.cancel();
      const endpoint = path.split("?", 1)[0];
      const message = response.status === 429
        ? "Too many attempts. Please wait a minute before trying again."
        : response.status === 503 && ["auth/send-verification-email", "auth/request-password-reset"].includes(endpoint)
          ? "Email service is unavailable right now. Please try again later."
          : response.status === 401 && endpoint === "auth/sign-in/email"
          ? "Email or password is incorrect."
          : response.status === 401 && endpoint === "auth/verify-email"
            ? "This verification link is invalid or expired. Request a new link from your profile."
            : response.status === 400 && endpoint === "auth/reset-password"
              ? "This reset link is invalid or expired. Request a new password reset link and try again."
          : response.status === 422
            ? "An account could not be created with these details. Try signing in instead."
            : response.status === 400
              ? "Check your details and try again."
              : "Account services are unavailable. Please try again.";
      throw new AccountError(message, response.status);
    }
    if (body) {
      await response.body?.cancel();
      return;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("Cannot reach account services. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function currentUser(timeoutMs = 15_000): Promise<AccountUser | null> {
  try {
    const data = await request("me", undefined, timeoutMs);
    if (!data || typeof data !== "object" || !("user" in data)) throw new Error();
    const user = data.user as Partial<AccountUser> | null;
    if (!user || typeof user.id !== "string" || typeof user.name !== "string" || typeof user.email !== "string") throw new Error();
    return user as AccountUser;
  } catch (error) {
    if (error instanceof AccountError && error.status === 401) return null;
    if (error instanceof AccountError) throw error;
    throw new AccountError("Account services returned an invalid response. Please try again.");
  }
}

export async function submitAccount(mode: "signin" | "signup", details: { name?: string; email: string; password: string }) {
  await request(`auth/${mode === "signup" ? "sign-up" : "sign-in"}/email`, details);
}

export async function endAccountSession() {
  await request("auth/sign-out", {});
}

export async function requestPasswordReset(email: string) {
  await request("auth/request-password-reset", { email });
}

export async function sendVerificationEmail(email: string) {
  await request("auth/send-verification-email", { email });
}

export async function verifyEmail(token: string) {
  await request(`auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resetPassword(token: string, newPassword: string) {
  await request("auth/reset-password", { token, newPassword });
}
