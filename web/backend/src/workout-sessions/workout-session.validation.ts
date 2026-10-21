import { BadRequestException } from '@nestjs/common';

export const WORKOUT_EXERCISE_ID = 'two-arm-dumbbell-curl';
export const COUNTER_VERSION = 'world-full-v1';
export const COUNTER_VERSIONS = [COUNTER_VERSION, 'world-full-v2'] as const;
export type CounterVersion = typeof COUNTER_VERSIONS[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

export interface WorkoutSessionDraft {
  clientId: string;
  counterVersion: CounterVersion;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  completedReps: number;
  interrupted: boolean;
}

function invalid(): never {
  throw new BadRequestException({ code: 'INVALID_SESSION', message: 'Session data is invalid.' });
}

function parseDate(value: unknown): Date {
  if (typeof value !== 'string') return invalid();
  const match = ISO_DATETIME.exec(value);
  if (!match) return invalid();
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, fraction = '', zone, , offsetHourRaw, offsetMinuteRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const milliseconds = Number(fraction.padEnd(3, '0'));
  const local = new Date(0);
  local.setUTCFullYear(year, month - 1, day);
  local.setUTCHours(hour, minute, second, milliseconds);
  if (month < 1 || month > 12 || local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 || local.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return invalid();
  if (zone !== 'Z') {
    const offsetHour = Number(offsetHourRaw);
    const offsetMinute = Number(offsetMinuteRaw);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return invalid();
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return invalid();
  return parsed;
}

export function parseWorkoutSessionDraft(input: unknown, now = new Date()): WorkoutSessionDraft {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const body = input as Record<string, unknown>;
  const fields = Object.keys(body).sort();
  const allowedFields = ['clientId', 'completedReps', 'counterVersion', 'endedAt', 'interrupted', 'startedAt'];
  const requiredFields = allowedFields.filter(field => field !== 'counterVersion' || body.counterVersion !== undefined);
  if (fields.length !== requiredFields.length || fields.some(field => !allowedFields.includes(field)) || requiredFields.some(field => !fields.includes(field))) return invalid();
  if (typeof body.clientId !== 'string' || !UUID.test(body.clientId)) return invalid();
  const counterVersion = body.counterVersion === undefined ? COUNTER_VERSION : body.counterVersion;
  if (typeof counterVersion !== 'string' || !(COUNTER_VERSIONS as readonly string[]).includes(counterVersion)) return invalid();
  if (!Number.isInteger(body.completedReps) || (body.completedReps as number) < 0 || (body.completedReps as number) > 1000) return invalid();
  if (typeof body.interrupted !== 'boolean') return invalid();

  const startedAt = parseDate(body.startedAt);
  const endedAt = parseDate(body.endedAt);
  const durationMilliseconds = endedAt.getTime() - startedAt.getTime();
  const futureLimit = now.getTime() + 5 * 60 * 1000;
  if (durationMilliseconds <= 0 || durationMilliseconds > 2 * 60 * 60 * 1000 || startedAt.getTime() > futureLimit || endedAt.getTime() > futureLimit) return invalid();

  return {
    clientId: body.clientId.toLowerCase(),
    counterVersion: counterVersion as CounterVersion,
    startedAt,
    endedAt,
    durationSeconds: Math.round(durationMilliseconds / 1000),
    completedReps: body.completedReps as number,
    interrupted: body.interrupted,
  };
}

export function parsePageLimit(value: unknown): number {
  if (value === undefined) return 20;
  if (typeof value !== 'string' || !/^\d{1,2}$/.test(value)) return invalid();
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return invalid();
  return limit;
}

export function parseWorkoutSessionPageQuery(input: unknown): { limit: number; cursor?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const query = input as Record<string, unknown>;
  const fields = Object.keys(query);
  if (fields.some(field => field !== 'limit' && field !== 'cursor')) return invalid();
  if (query.cursor !== undefined && typeof query.cursor !== 'string') return invalid();
  return {
    limit: parsePageLimit(query.limit),
    ...(typeof query.cursor === 'string' ? { cursor: query.cursor } : {}),
  };
}
