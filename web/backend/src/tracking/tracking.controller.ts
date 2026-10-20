import { Controller, Get, Param, Res } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import {
  TRACKING_ASSET_FILENAMES,
  TRACKING_ASSET_VERSION,
  TrackingService,
} from "./tracking.service.js";
import { TrackingConfigDto } from "./dto/tracking-config.dto.js";

@Controller("tracking")
@ApiTags("Live tracking assets")
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get("config")
  @ApiOperation({
    summary: "Get the available local tracking asset configuration",
    description:
      "Returns same-origin URLs for the pinned model and WASM files. Assets must be provisioned before this route succeeds.",
  })
  @ApiOkResponse({ type: TrackingConfigDto })
  @ApiServiceUnavailableResponse({
    description: "Tracking assets are unavailable.",
  })
  getConfig(@Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.tracking.configResponse();
  }

  @Get(`assets/:version/:filename`)
  @ApiOperation({
    summary: "Download an allow-listed versioned tracking asset",
    description:
      "Serves only the pinned local files; no client-provided URL or file path is fetched.",
  })
  @ApiParam({ name: "version", example: TRACKING_ASSET_VERSION })
  @ApiParam({
    name: "filename",
    enum: TRACKING_ASSET_FILENAMES,
  })
  @ApiResponse({
    status: 200,
    description: "Versioned JavaScript, WASM, or pose-task file.",
    content: {
      "application/wasm": { schema: { type: "string", format: "binary" } },
      "text/javascript": { schema: { type: "string", format: "binary" } },
      "application/octet-stream": {
        schema: { type: "string", format: "binary" },
      },
    },
  })
  @ApiNotFoundResponse({
    description: "Asset version or filename is not supported.",
  })
  @ApiServiceUnavailableResponse({
    description: "Asset file is not provisioned.",
  })
  getAsset(
    @Param("version") version: string,
    @Param("filename") filename: string,
    @Res() response: Response,
  ) {
    if (version !== TRACKING_ASSET_VERSION) {
      response.status(404).end();
      return;
    }
    const path = this.tracking.assetPath(version, filename);
    this.tracking.stream(path, response);
  }
}
