export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 0,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  expect?: "json" | "none";
  timeoutMs?: number;
};

function backendErrorMessage(value: unknown) {
  if (!isRecord(value)) return undefined;
  if (typeof value.message === "string" && value.message.trim()) return value.message;
  if (Array.isArray(value.message) && value.message.every((entry) => typeof entry === "string")) {
    return value.message.join(" ");
  }
  return undefined;
}

function backendErrorCode(value: unknown) {
  return isRecord(value) && typeof value.code === "string" ? value.code : undefined;
}

function isJsonContentType(value: string) {
  return /(?:application\/json|application\/[^;]+\+json)(?:\s*;|$)/i.test(value);
}

export async function requestJson(path: string, options: ApiRequestOptions = {}): Promise<unknown> {
  const { body, expect = "json", headers, timeoutMs = 15_000, signal, ...init } = options;
  const requestController = new AbortController();
  let timedOut = false;
  const abortRequest = () => requestController.abort();
  if (signal?.aborted) requestController.abort();
  else signal?.addEventListener("abort", abortRequest, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, timeoutMs);
  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  try {
    const response = await fetch(path, {
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: init.cache ?? "no-store",
      signal: requestController.signal,
    });
    if (!response.ok) {
      let value: unknown;
      try {
        if (isJsonContentType(response.headers.get("content-type") ?? "")) value = await response.json();
        else await response.body?.cancel();
      } catch {
        if (timedOut || signal?.aborted) throw new Error("Request aborted while reading error response.");
        value = undefined;
      }
      throw new ApiError(
        backendErrorMessage(value) ?? "The service could not complete the request. Please try again.",
        response.status,
        backendErrorCode(value),
      );
    }

    if (response.status === 204) {
      await response.body?.cancel();
      return undefined;
    }

    if (!isJsonContentType(response.headers.get("content-type") ?? "")) {
      await response.body?.cancel();
      throw new ApiError("The service returned an invalid response. Please try again.", response.status);
    }

    if (expect === "none") {
      await response.body?.cancel();
      return undefined;
    }

    try {
      return await response.json();
    } catch (failure) {
      if (timedOut || signal?.aborted) throw failure;
      throw new ApiError("The service returned an invalid response. Please try again.", response.status);
    }
  } catch (failure) {
    if (failure instanceof ApiError) throw failure;
    if (signal?.aborted) throw failure;
    if (timedOut) throw new ApiError("The request timed out. Please try again.");
    throw new ApiError("Cannot reach the service. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortRequest);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
