import type { Exercise, ExerciseCatalog, ExerciseGroup, ExercisePhotoSet } from "./types";
import { ApiError, isNonEmptyString, isRecord, requestJson } from "../api/client";

export { ApiError as ExerciseApiError };

const supportedCameraExercise = "two-arm-dumbbell-curl";
const allowedGroups: ExerciseGroup[] = ["All", "Arms", "Chest", "Back", "Shoulders", "Legs", "Core"];

const isText = isNonEmptyString;

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
    throw new ApiError("Exercise guides returned an invalid response.");
  }
  if (!value.groups.every((group) => typeof group === "string" && allowedGroups.includes(group as ExerciseGroup))) {
    throw new ApiError("Exercise guides returned an invalid response.");
  }
  const groups = value.groups as ExerciseGroup[];
  if (groups[0] !== "All" || new Set(groups).size !== groups.length || !value.items.every(isExercise)) {
    throw new ApiError("Exercise guides returned an invalid response.");
  }
  const items = value.items as Exercise[];
  if (new Set(items.map((item) => item.id)).size !== items.length || items.some((item) => !groups.includes(item.group))) {
    throw new ApiError("Exercise guides returned an invalid response.");
  }
  return { items, groups };
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  return requestJson(`/api/exercises${path}`, {
    method: "GET",
    credentials: "omit",
    signal,
    timeoutMs: 10_000,
  });
}

export async function fetchExerciseCatalog(signal?: AbortSignal): Promise<ExerciseCatalog> {
  return parseCatalog(await getJson("", signal));
}

export async function fetchExerciseGuide(id: string, signal?: AbortSignal): Promise<Exercise> {
  const value = await getJson(`/${encodeURIComponent(id)}`, signal);
  if (!isExercise(value) || value.id !== id) throw new ApiError("Exercise guides returned an invalid response.");
  return value;
}
