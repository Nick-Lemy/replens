import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Response } from 'express';
import type { AppConfig } from '../config/config.js';

export const TRACKING_ASSET_VERSION = 'tasks-vision-1.1.1-pose-full-float16-1';
export const TRACKING_EXERCISE_ID = 'two-arm-dumbbell-curl';
export const TRACKING_ASSET_FILENAMES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
  'pose_landmarker_full_v1.task',
] as const;

@Injectable()
export class TrackingService {
  constructor(@Inject('APP_CONFIG') private readonly config: AppConfig) {}

  assetPath(version: string, filename: string): string {
    if (version !== TRACKING_ASSET_VERSION || !(TRACKING_ASSET_FILENAMES as readonly string[]).includes(filename)) {
      throw new NotFoundException();
    }
    const path = join(this.config.trackingAssetDir, filename);
    try {
      if (!statSync(path).isFile()) throw new Error('Not a file');
    } catch {
      throw new ServiceUnavailableException({ code: 'TRACKING_ASSETS_UNAVAILABLE', message: 'Pose tracking assets are not provisioned.' });
    }
    return path;
  }

  assertReady(): void {
    if (!TRACKING_ASSET_FILENAMES.every(filename => {
      const path = join(this.config.trackingAssetDir, filename);
      try { return existsSync(path) && statSync(path).isFile() && statSync(path).size > 0; }
      catch { return false; }
    })) {
      throw new ServiceUnavailableException({ code: 'TRACKING_ASSETS_UNAVAILABLE', message: 'Pose tracking assets are not provisioned.' });
    }
  }

  configResponse() {
    this.assertReady();
    const root = `/api/tracking/assets/${TRACKING_ASSET_VERSION}/`;
    return {
      runtimeVersion: '1.1.1',
      modelUrl: `${root}pose_landmarker_full_v1.task`,
      wasmRoot: root,
      exerciseId: TRACKING_EXERCISE_ID,
    };
  }

  stream(path: string, response: Response): void {
    const contentType = path.endsWith('.wasm')
      ? 'application/wasm'
      : path.endsWith('.js')
        ? 'text/javascript; charset=utf-8'
        : 'application/octet-stream';
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    createReadStream(path).on('error', () => response.destroy()).pipe(response);
  }
}
