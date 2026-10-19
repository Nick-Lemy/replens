import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TRACKING_ASSET_VERSION, TrackingService } from './tracking.service.js';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get('config')
  getConfig(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.tracking.configResponse();
  }

  @Get(`assets/:version/:filename`)
  getAsset(@Param('version') version: string, @Param('filename') filename: string, @Res() response: Response) {
    if (version !== TRACKING_ASSET_VERSION) {
      response.status(404).end();
      return;
    }
    const path = this.tracking.assetPath(version, filename);
    this.tracking.stream(path, response);
  }
}
