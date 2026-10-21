import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { AppConfig } from '../config/config.js';
import { AuthController, AuthProvidersController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({})
export class AuthModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AuthModule,
      controllers: [AuthController, AuthProvidersController],
      providers: [
        { provide: DatabaseService, useFactory: () => new DatabaseService(config) },
        { provide: AuthService, inject: [DatabaseService], useFactory: (database: DatabaseService) => new AuthService(database, config) },
      ],
      exports: [AuthService, DatabaseService],
    };
  }
}
