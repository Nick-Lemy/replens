import {
  Controller,
  Get,
  Param,
  Res,
  StreamableFile,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { EXPERIMENTAL_RIR_BUNDLES } from "./experimental-rir-bundle.js";
import { ExperimentalRirConfigDto } from "./dto/experimental-rir-config.dto.js";
import { ExperimentalRirService } from "./experimental-rir.service.js";

@Controller("experimental-rir")
@ApiTags("Experimental RIR demo")
export class ExperimentalRirController {
  constructor(private readonly rir: ExperimentalRirService) {}

  @Get("config")
  @ApiOperation({
    summary: "Get the default speed-only synthetic RIR model configuration",
    description:
      "This backward-compatible route returns the speed-only model. It is an illustrative synthetic model, not research evidence or validated for real curls; any estimate must remain labeled a synthetic experimental preview, not validated exercise feedback.",
  })
  @ApiOkResponse({ type: ExperimentalRirConfigDto })
  @ApiServiceUnavailableResponse({
    description: "The synthetic model bundle is missing or invalid.",
  })
  getDefaultConfig(@Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.rir.config();
  }

  @Get("config/:model")
  @ApiOperation({
    summary: "Get an explicitly selected synthetic RIR model configuration",
    description:
      "Use `speed-only` or `speed-movement`. The movement model requires the third `movement_instability` input, which is synthetic and not a calibrated tremor measurement. Neither model is research evidence or validated exercise feedback.",
  })
  @ApiParam({
    name: "model",
    enum: Object.keys(EXPERIMENTAL_RIR_BUNDLES),
  })
  @ApiOkResponse({ type: ExperimentalRirConfigDto })
  @ApiBadRequestResponse({ description: "The selected model is unsupported." })
  @ApiServiceUnavailableResponse({
    description: "The selected synthetic model bundle is missing or invalid.",
  })
  getSelectedConfig(
    @Param("model") model: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    return this.rir.config(model);
  }

  @Get("assets/:version/:filename")
  @ApiOperation({
    summary: "Download a fixed synthetic RIR ONNX asset",
    description:
      "Serves either allowlisted synthetic model bundle after hash verification. No client-provided filesystem path or remote URL is read.",
  })
  @ApiParam({
    name: "version",
    enum: Object.values(EXPERIMENTAL_RIR_BUNDLES).map(({ version }) => version),
  })
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
