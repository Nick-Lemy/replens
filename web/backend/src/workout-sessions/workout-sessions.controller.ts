import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { AuthService } from "../auth/auth.service.js";
import {
  parseWorkoutSessionDraft,
  parseWorkoutSessionPageQuery,
} from "./workout-session.validation.js";
import { WorkoutSessionsService } from "./workout-sessions.service.js";
import { CreateWorkoutSessionDto } from "./dto/create-workout-session.dto.js";
import {
  WorkoutSessionDto,
  WorkoutSessionPageDto,
} from "./dto/workout-session.dto.js";
import { ApiErrorResponse } from "../swagger/api-error-response.decorator.js";

function requestContentType(request: Request): string | undefined {
  return request.get("content-type")?.split(";", 1)[0].trim();
}

@Controller("workout-sessions")
@ApiTags("Workout sessions")
@ApiCookieAuth("RepLensSessionCookie")
export class WorkoutSessionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: WorkoutSessionsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Save a client-reported session summary",
    description:
      "Duration, exercise ID, counter version, and creation time are server-derived. Same-client retries return the existing summary; changed data conflicts.",
  })
  @ApiBody({
    type: CreateWorkoutSessionDto,
    description:
      "Exactly these five fields are accepted. Extra keys are rejected. Times must be valid ISO date-times, start before end, duration at most two hours, and no more than five minutes in the future.",
  })
  @ApiCreatedResponse({ type: WorkoutSessionDto, description: "Created." })
  @ApiOkResponse({
    type: WorkoutSessionDto,
    description: "An idempotent retry returned the existing record.",
  })
  @ApiErrorResponse(400, "Invalid body or timestamps.")
  @ApiErrorResponse(401, "Sign in required.")
  @ApiErrorResponse(403, "Origin is not allowed.")
  @ApiErrorResponse(409, "Client ID was already used with different data.")
  @ApiErrorResponse(415, "JSON content type required.")
  async create(
    @Req() request: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = await this.requireUserId(request);
    this.sessions.assertMutationRequest(
      request.get("origin"),
      requestContentType(request),
    );
    const result = await this.sessions.create(
      userId,
      parseWorkoutSessionDraft(body),
    );
    response.status(result.created ? 201 : 200);
    return result.item;
  }

  @Get()
  @ApiOperation({
    summary: "List the signed-in user session summaries",
    description:
      "Newest sessions first. Cursor is opaque and signed. Limit defaults to 20 and is capped at 50. Unknown query parameters are rejected.",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    minimum: 1,
    maximum: 50,
    description: "Maximum number of records to return (default 20).",
  })
  @ApiQuery({
    name: "cursor",
    required: false,
    type: String,
    description: "Opaque cursor returned by the previous page.",
  })
  @ApiOkResponse({ type: WorkoutSessionPageDto })
  @ApiErrorResponse(400, "Invalid query or cursor.")
  @ApiErrorResponse(401, "Sign in required.")
  async list(
    @Req() request: Request,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const userId = await this.requireUserId(request);
    const pagination = parseWorkoutSessionPageQuery(rawQuery);
    return this.sessions.list(userId, pagination.limit, pagination.cursor);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get an owned session summary",
    description: "Other users’ records return 404.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: WorkoutSessionDto })
  @ApiErrorResponse(401, "Sign in required.")
  @ApiErrorResponse(404, "Session not found.")
  async get(@Req() request: Request, @Param("id") id: string) {
    const userId = await this.requireUserId(request);
    return this.sessions.get(userId, id);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({
    summary: "Delete an owned session summary",
    description:
      "The request must use application/json. An absent body or an empty JSON object is accepted; Swagger sends `{}` to ensure the JSON content type.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({
    required: false,
    schema: { type: "object", maxProperties: 0, additionalProperties: false },
  })
  @ApiNoContentResponse({ description: "Deleted." })
  @ApiErrorResponse(400, "Body must be empty.")
  @ApiErrorResponse(401, "Sign in required.")
  @ApiErrorResponse(403, "Origin is not allowed.")
  @ApiErrorResponse(404, "Session not found.")
  @ApiErrorResponse(415, "JSON content type required.")
  async delete(@Req() request: Request, @Param("id") id: string) {
    const userId = await this.requireUserId(request);
    this.sessions.assertMutationRequest(
      request.get("origin"),
      requestContentType(request),
    );
    const body: unknown = request.body;
    if (
      body !== undefined &&
      (!body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    ) {
      throw new BadRequestException({
        code: "INVALID_SESSION_REQUEST",
        message: "Session deletion does not accept a request body.",
      });
    }
    await this.sessions.delete(userId, id);
  }

  private async requireUserId(request: Request): Promise<string> {
    const session = await this.authService.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session)
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Sign in to access workout history.",
      });
    return session.user.id;
  }
}
