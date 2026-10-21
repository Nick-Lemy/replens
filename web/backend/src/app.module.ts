import { DynamicModule, Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module.js';
import { ExercisesModule } from './exercises/exercises.module.js';
import { ExperimentalRirModule } from './experimental-rir/experimental-rir.module.js';
import type { AppConfig } from './config/config.js';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    const authModule = AuthModule.register(config);
    return {
      module: AppModule,
      imports: [
        HealthModule,
        authModule,
        TrackingModule.register(config),
        WorkoutSessionsModule.register(authModule, config),
        ExercisesModule,
        ExperimentalRirModule,
      ],
    };
  }
}
