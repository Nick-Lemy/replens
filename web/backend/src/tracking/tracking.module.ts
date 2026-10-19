import { DynamicModule, Module } from '@nestjs/common';
import type { AppConfig } from '../config/config.js';
import { TrackingController } from './tracking.controller.js';
import { TrackingService } from './tracking.service.js';

@Module({})
export class TrackingModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: TrackingModule,
      controllers: [TrackingController],
      providers: [TrackingService, { provide: 'APP_CONFIG', useValue: config }],
    };
  }
}
