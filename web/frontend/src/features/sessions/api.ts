import { ApiError, requestJson } from "../api/client";

export { ApiError as WorkoutSessionError };

export interface WorkoutSession {
  id: string;
  exerciseId: "two-arm-dumbbell-curl";
  counterVersion: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  completedReps: number;
  interrupted: boolean;
  createdAt: string;
}

export interface WorkoutSessionDraft {
  clientId: string;
  startedAt: string;
  endedAt: string;
  completedReps: number;
  interrupted: boolean;
  ownerUserId: string | null;
}

export interface WorkoutSessionPage {
  items: WorkoutSession[];
  nextCursor: string | null;
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function isWorkoutSession(value: unknown): value is WorkoutSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && item.id.length > 0
    && item.exerciseId === "two-arm-dumbbell-curl"
    && item.counterVersion === "world-full-v1"
    && isIsoDateTime(item.startedAt)
    && isIsoDateTime(item.endedAt)
    && Date.parse(item.endedAt) > Date.parse(item.startedAt)
    && Number.isInteger(item.durationSeconds)
    && (item.durationSeconds as number) >= 0
    && Number.isInteger(item.completedReps)
    && (item.completedReps as number) >= 0
    && (item.completedReps as number) <= 1000
    && typeof item.interrupted === "boolean"
    && isIsoDateTime(item.createdAt);
}

function invalidResponse(): never {
  throw new ApiError("Session services returned an invalid response.");
}

async function request(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: object; signal?: AbortSignal } = {},
): Promise<unknown> {
  const method = options.method ?? "GET";
  return requestJson(`/api/workout-sessions${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
    headers: method === "GET" ? undefined : { "Content-Type": "application/json" },
    body: options.body,
    expect: method === "DELETE" ? "none" : "json",
  });
}

export async function createWorkoutSession(draft: WorkoutSessionDraft, signal?: AbortSignal): Promise<WorkoutSession> {
  const { ownerUserId: _ownerUserId, ...body } = draft;
  const result = await request("", { method: "POST", body, signal });
  if (!isWorkoutSession(result)) invalidResponse();
  return result;
}

export async function listWorkoutSessions(
  limit = 20,
  cursor?: string,
  signal?: AbortSignal,
): Promise<WorkoutSessionPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const result = await request(`?${query}`, { signal });
  if (!result || typeof result !== "object") invalidResponse();
  const page = result as Record<string, unknown>;
  if (!Array.isArray(page.items) || !page.items.every(isWorkoutSession)
    || !(page.nextCursor === null || typeof page.nextCursor === "string")) invalidResponse();
  return page as unknown as WorkoutSessionPage;
}

export async function getWorkoutSession(id: string, signal?: AbortSignal): Promise<WorkoutSession> {
  const result = await request(`/${encodeURIComponent(id)}`, { signal });
  if (!isWorkoutSession(result) || result.id !== id) invalidResponse();
  return result;
}

export async function deleteWorkoutSession(id: string, signal?: AbortSignal): Promise<void> {
  await request(`/${encodeURIComponent(id)}`, { method: "DELETE", signal });
}
