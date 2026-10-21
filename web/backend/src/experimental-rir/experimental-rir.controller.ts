import {
  Controller,
  Get,
  Param,
  Res,
  StreamableFile,
} from "@nestjs/common";
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
import { EXPERIMENTAL_RIR_VERSION } from "./experimental-rir-bundle.js";
import { ExperimentalRirConfigDto } from "./dto/experimental-rir-config.dto.js";
import { ExperimentalRirService } from "./experimental-rir.service.js";

@Controller("experimental-rir")
@ApiTags("Experimental RIR demo")
export class ExperimentalRirController {
  constructor(private readonly rir: ExperimentalRirService) {}

  @Get("config")
  @ApiOperation({
    summary: "Get the opt-in synthetic speed-only RIR model configuration",
    description:
      "This illustrative synthetic model is not research evidence or validated for real curls. It reports a raw continuous estimate and must remain labeled a synthetic experimental preview, not validated exercise feedback.",
  })
  @ApiOkResponse({ type: ExperimentalRirConfigDto })
  @ApiServiceUnavailableResponse({
    description: "The synthetic model bundle is missing or invalid.",
  })
  getConfig(@Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.rir.config();
  }

  @Get("assets/:version/:filename")
  @ApiOperation({
    summary: "Download the fixed synthetic speed-only ONNX asset",
    description:
      "Serves one bundled, hash-verified model version. No client-provided path or remote URL is read.",
  })
  @ApiParam({ name: "version", enum: [EXPERIMENTAL_RIR_VERSION] })
  @ApiParam({ name: "filename", enum: ["model.onnx"] })
  @ApiResponse({
    status: 200,
    description: "Hash-verified synthetic-only ONNX model.",
    content: {
      "application/octet-stream": {
        schema: { type: "string", format: "binary" },
      },
    },
  })
  @ApiNotFoundResponse({ description: "Asset version or filename is unsupported." })
  @ApiServiceUnavailableResponse({
    description: "The synthetic model bundle is missing or invalid.",
  })
  getAsset(
    @Param("version") version: string,
    @Param("filename") filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const model = this.rir.asset(version, filename);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(model, { type: "application/octet-stream" });
  }
}
