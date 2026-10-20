import type { Exercise, ExerciseCatalog, ExerciseGroup, ExercisePhotoSet } from "./types";

const supportedCameraExercise = "two-arm-dumbbell-curl";
const allowedGroups: ExerciseGroup[] = ["All", "Arms", "Chest", "Back", "Shoulders", "Legs", "Core"];

export class ExerciseApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isPhotoSet(value: unknown): value is ExercisePhotoSet {
  if (!isRecord(value) || !Array.isArray(value.images) || value.images.length === 0) return false;
  if (!value.images.every(isSafeHttpsUrl)) return false;
  if (!isSafeHttpsUrl(value.sourceUrl) || !isSafeHttpsUrl(value.creditUrl) || !isSafeHttpsUrl(value.licenseUrl)) return false;
  if (!isText(value.credit) || !isText(value.license)) return false;
  return value.variation === undefined || isText(value.variation);
}

function isExercise(value: unknown): value is Exercise {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) return false;
  if (!isText(value.name) || !isText(value.group) || !allowedGroups.includes(value.group as ExerciseGroup) || value.group === "All") return false;
  if (!isText(value.equipment) || !isText(value.focus) || !isText(value.referenceLabel)) return false;
  if (!isSafeHttpsUrl(value.referenceUrl) || !isPhotoSet(value.photos)) return false;
  if (!Array.isArray(value.steps) || value.steps.length === 0 || !value.steps.every((step) =>
    Array.isArray(step) && step.length === 2 && step.every(isText))) return false;
  if (!Array.isArray(value.tips) || value.tips.length === 0 || !value.tips.every(isText)) return false;
  if (typeof value.cameraPreview !== "boolean") return false;
  return value.cameraPreview === (value.id === supportedCameraExercise);
}

function parseCatalog(value: unknown): ExerciseCatalog {
  if (!isRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.groups)) {
    throw new ExerciseApiError("Exercise guides returned an invalid response.");
  }
  if (!value.groups.every((group) => typeof group === "string" && allowedGroups.includes(group as ExerciseGroup))) {
    throw new ExerciseApiError("Exercise guides returned an invalid response.");
  }
  const groups = value.groups as ExerciseGroup[];
  if (groups[0] !== "All" || new Set(groups).size !== groups.length || !value.items.every(isExercise)) {
    throw new ExerciseApiError("Exercise guides returned an invalid response.");
  }
  const items = value.items as Exercise[];
  if (new Set(items.map((item) => item.id)).size !== items.length || items.some((item) => !groups.includes(item.group))) {
    throw new ExerciseApiError("Exercise guides returned an invalid response.");
  }
  return { items, groups };
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(`/api/exercises${path}`, {
      method: "GET",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 404) throw new ExerciseApiError("This exercise guide could not be found.", 404);
      if (response.status === 400) throw new ExerciseApiError("Exercise guides returned an invalid request.", 400);
      throw new ExerciseApiError("Exercise guides are unavailable. Check your connection and try again.", response.status);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!/(?:application\/json|application\/[^;]+\+json)(?:\s*;|$)/i.test(contentType)) {
      await response.body?.cancel();
      throw new ExerciseApiError("Exercise guides returned an invalid response.");
    }
    return await response.json();
  } catch (failure) {
    if (signal?.aborted) throw failure;
    if (failure instanceof ExerciseApiError) throw failure;
    if (controller.signal.aborted) throw new ExerciseApiError("Exercise guide request timed out. Please try again.");
    throw new ExerciseApiError("Exercise guides are unavailable. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function fetchExerciseCatalog(signal?: AbortSignal): Promise<ExerciseCatalog> {
  return parseCatalog(await getJson("", signal));
}

export async function fetchExerciseGuide(id: string, signal?: AbortSignal): Promise<Exercise> {
  const value = await getJson(`/${encodeURIComponent(id)}`, signal);
  if (!isExercise(value) || value.id !== id) throw new ExerciseApiError("Exercise guides returned an invalid response.");
  return value;
}
