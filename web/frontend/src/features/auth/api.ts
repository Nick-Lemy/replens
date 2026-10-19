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

async function request(path: string, body?: object) {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    response = await fetch(`/api/${path}`, {
      signal: controller.signal,
      method: body ? "POST" : "GET",
      credentials: "include",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AccountError("Cannot reach account services. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const message = response.status === 429
      ? "Too many attempts. Please wait a minute before trying again."
      : response.status === 401
        ? "Email or password is incorrect."
        : response.status === 422
          ? "An account could not be created with these details. Try signing in instead."
          : response.status === 400
            ? "Check your details and try again."
            : "Account services are unavailable. Please try again.";
    throw new AccountError(message, response.status);
  }
  return response;
}

export async function currentUser(): Promise<AccountUser | null> {
  try {
    const response = await request("me");
    const data: unknown = await response.json();
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
