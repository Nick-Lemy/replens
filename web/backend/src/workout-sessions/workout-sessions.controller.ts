import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { parseWorkoutSessionDraft, parseWorkoutSessionPageQuery } from './workout-session.validation.js';
import { WorkoutSessionsService } from './workout-sessions.service.js';

function requestContentType(request: Request): string | undefined {
  return request.get('content-type')?.split(';', 1)[0].trim();
}

@Controller('workout-sessions')
export class WorkoutSessionsController {
  constructor(private readonly authService: AuthService, private readonly sessions: WorkoutSessionsService) {}

  @Post()
  async create(@Req() request: Request, @Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const userId = await this.requireUserId(request);
    this.sessions.assertMutationRequest(request.get('origin'), requestContentType(request));
    const result = await this.sessions.create(userId, parseWorkoutSessionDraft(body));
    response.status(result.created ? 201 : 200);
    return result.item;
  }

  @Get()
  async list(@Req() request: Request, @Query() rawQuery: Record<string, unknown>) {
    const userId = await this.requireUserId(request);
    const pagination = parseWorkoutSessionPageQuery(rawQuery);
    return this.sessions.list(userId, pagination.limit, pagination.cursor);
  }

  @Get(':id')
  async get(@Req() request: Request, @Param('id') id: string) {
    const userId = await this.requireUserId(request);
    return this.sessions.get(userId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Req() request: Request, @Param('id') id: string) {
    const userId = await this.requireUserId(request);
    this.sessions.assertMutationRequest(request.get('origin'), requestContentType(request));
    const body: unknown = request.body;
    if (body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length > 0)) {
      throw new BadRequestException({ code: 'INVALID_SESSION_REQUEST', message: 'Session deletion does not accept a request body.' });
    }
    await this.sessions.delete(userId, id);
  }

  private async requireUserId(request: Request): Promise<string> {
    const session = await this.authService.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Sign in to access workout history.' });
    return session.user.id;
  }
}
