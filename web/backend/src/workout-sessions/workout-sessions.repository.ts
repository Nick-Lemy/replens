import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { WorkoutSessionDraft } from './workout-session.validation.js';

export interface WorkoutSessionCursor {
  startedAt: Date;
  id: string;
}

@Injectable()
export class WorkoutSessionsRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  findByClientId(userId: string, clientId: string) {
    return this.database.workoutSession.findUnique({ where: { userId_clientId: { userId, clientId } } });
  }

  create(userId: string, draft: WorkoutSessionDraft, exerciseId: string) {
    return this.database.workoutSession.create({
      data: { ...draft, userId, exerciseId },
    });
  }

  list(userId: string, cursor: WorkoutSessionCursor | undefined, limit: number) {
    return this.database.workoutSession.findMany({
      where: {
        userId,
        ...(cursor ? {
          OR: [
            { startedAt: { lt: cursor.startedAt } },
            { startedAt: cursor.startedAt, id: { lt: cursor.id } },
          ],
        } : {}),
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  findOwned(userId: string, id: string) {
    return this.database.workoutSession.findFirst({ where: { id, userId } });
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const result = await this.database.workoutSession.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }
}
