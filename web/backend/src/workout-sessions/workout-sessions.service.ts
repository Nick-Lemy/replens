import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../config/config.js';
import { COUNTER_VERSION, WORKOUT_EXERCISE_ID, type WorkoutSessionDraft } from './workout-session.validation.js';
import { WorkoutSessionsRepository, type WorkoutSessionCursor } from './workout-sessions.repository.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toItem(row: Awaited<ReturnType<WorkoutSessionsRepository['findByClientId']>>) {
  if (!row) throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Workout session was not found.' });
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    counterVersion: row.counterVersion,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationSeconds: row.durationSeconds,
    completedReps: row.completedReps,
    interrupted: row.interrupted,
    createdAt: row.createdAt.toISOString(),
  };
}

function matchesDraft(row: NonNullable<Awaited<ReturnType<WorkoutSessionsRepository['findByClientId']>>>, draft: WorkoutSessionDraft): boolean {
  return row.startedAt.getTime() === draft.startedAt.getTime()
    && row.endedAt.getTime() === draft.endedAt.getTime()
    && row.durationSeconds === draft.durationSeconds
    && row.completedReps === draft.completedReps
    && row.interrupted === draft.interrupted;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class WorkoutSessionsService {
  constructor(
    private readonly repository: WorkoutSessionsRepository,
    @Inject('WORKOUT_SESSION_CONFIG') private readonly config: AppConfig,
  ) {}

  assertMutationRequest(origin: string | undefined, contentType: string | undefined): void {
    const allowedOrigins = new Set([new URL(this.config.authUrl).origin, ...this.config.frontendOrigins]);
    let allowed = false;
    try { allowed = typeof origin === 'string' && new URL(origin).origin === origin && allowedOrigins.has(origin); }
    catch { allowed = false; }
    if (!allowed) throw new ForbiddenException({ code: 'UNTRUSTED_ORIGIN', message: 'Request origin is not allowed.' });
    if (contentType?.toLowerCase() !== 'application/json') throw new UnsupportedMediaTypeException({ code: 'JSON_REQUIRED', message: 'Session requests must use JSON.' });
  }

  async create(userId: string, draft: WorkoutSessionDraft) {
    const existing = await this.repository.findByClientId(userId, draft.clientId);
    if (existing) {
      if (!matchesDraft(existing, draft)) throw new ConflictException({ code: 'SESSION_IDEMPOTENCY_CONFLICT', message: 'This session request conflicts with an earlier request.' });
      return { item: toItem(existing), created: false };
    }

    try {
      const row = await this.repository.create(userId, draft, WORKOUT_EXERCISE_ID, COUNTER_VERSION);
      return { item: toItem(row), created: true };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const raced = await this.repository.findByClientId(userId, draft.clientId);
      if (!raced) throw error;
      if (!matchesDraft(raced, draft)) throw new ConflictException({ code: 'SESSION_IDEMPOTENCY_CONFLICT', message: 'This session request conflicts with an earlier request.' });
      return { item: toItem(raced), created: false };
    }
  }

  async list(userId: string, limit: number, cursorToken?: string) {
    const cursor = cursorToken === undefined ? undefined : this.decodeCursor(cursorToken);
    const rows = await this.repository.list(userId, cursor, limit);
    const hasMore = rows.length > limit;
    const visibleRows = hasMore ? rows.slice(0, limit) : rows;
    const items = visibleRows.map(row => toItem(row));
    const last = visibleRows.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? this.encodeCursor({ id: last.id, startedAt: last.startedAt }) : null,
    };
  }

  async get(userId: string, id: string) {
    const row = await this.repository.findOwned(userId, id);
    if (!row) throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Workout session was not found.' });
    return toItem(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!await this.repository.deleteOwned(userId, id)) throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Workout session was not found.' });
  }

  private encodeCursor(cursor: WorkoutSessionCursor): string {
    const payload = Buffer.from(JSON.stringify({ id: cursor.id, startedAt: cursor.startedAt.toISOString() })).toString('base64url');
    const signature = createHmac('sha256', this.config.authSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private decodeCursor(token: string): WorkoutSessionCursor {
    if (typeof token !== 'string' || token.length > 512) throw this.invalidCursor();
    const parts = token.split('.');
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) throw this.invalidCursor();
    const expected = createHmac('sha256', this.config.authSecret).update(parts[0]).digest();
    let received: Buffer;
    try { received = Buffer.from(parts[1], 'base64url'); } catch { throw this.invalidCursor(); }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw this.invalidCursor();
    try {
      const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Record<string, unknown>;
      if (!value || Object.keys(value).length !== 2 || typeof value.id !== 'string' || !UUID.test(value.id) || typeof value.startedAt !== 'string') throw this.invalidCursor();
      const startedAt = new Date(value.startedAt);
      if (!Number.isFinite(startedAt.getTime()) || startedAt.toISOString() !== value.startedAt) throw this.invalidCursor();
      return { id: value.id, startedAt };
    } catch {
      throw this.invalidCursor();
    }
  }

  private invalidCursor() {
    return new BadRequestException({ code: 'INVALID_CURSOR', message: 'The page cursor is invalid.' });
  }
}
