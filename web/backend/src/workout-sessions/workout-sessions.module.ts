import { DynamicModule, Module } from '@nestjs/common';
import type { AppConfig } from '../config/config.js';
import { WorkoutSessionsController } from './workout-sessions.controller.js';
import { WorkoutSessionsRepository } from './workout-sessions.repository.js';
import { WorkoutSessionsService } from './workout-sessions.service.js';

@Module({})
export class WorkoutSessionsModule {
  static register(authModule: DynamicModule, config: AppConfig): DynamicModule {
    return {
      module: WorkoutSessionsModule,
      imports: [authModule],
      controllers: [WorkoutSessionsController],
      providers: [
        WorkoutSessionsRepository,
        WorkoutSessionsService,
        { provide: 'WORKOUT_SESSION_CONFIG', useValue: config },
      ],
    };
  }
}
