import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ExercisesService } from "./exercises.service.js";
import {
  ExerciseGuideDto,
  ExerciseGuideListDto,
} from "./dto/exercise-guide.dto.js";

@Controller("exercises")
@ApiTags("Exercise guides")
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  @ApiOperation({
    summary: "List the curated exercise guides",
    description:
      "Public read-only catalog. Query parameters are not supported. Only the two-arm dumbbell curl guide enables camera preview; this does not imply validated tracking or RIR support for other exercises.",
  })
  @ApiOkResponse({ type: ExerciseGuideListDto })
  @ApiBadRequestResponse({
    description: "Exercise guides do not accept query parameters.",
  })
  list(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertNoQuery(request);
    response.setHeader("Cache-Control", "public, max-age=300");
    return this.exercises.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one curated exercise guide" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: ExerciseGuideDto })
  @ApiBadRequestResponse({
    description: "Exercise guides do not accept query parameters.",
  })
  @ApiNotFoundResponse({ description: "Guide not found." })
  get(
    @Req() request: Request,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertNoQuery(request);
    const exercise = this.exercises.get(id);
    response.setHeader("Cache-Control", "public, max-age=300");
    return exercise;
  }

  private assertNoQuery(request: Request): void {
    const url = new URL(request.originalUrl, "http://localhost");
    if (url.search.length > 0) {
      throw new BadRequestException({
        code: "UNSUPPORTED_QUERY",
        message: "Exercise guide endpoints do not accept query parameters.",
      });
    }
  }
}
