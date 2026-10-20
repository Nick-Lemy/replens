import { DynamicModule, Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import type { AppConfig } from './config/config.js';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return { module: AppModule, imports: [HealthModule, AuthModule.register(config), TrackingModule.register(config)] };
  }
}
