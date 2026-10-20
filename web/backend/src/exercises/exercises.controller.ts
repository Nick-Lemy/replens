import { BadRequestException, Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ExercisesService } from './exercises.service.js';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.assertNoQuery(request);
    response.setHeader('Cache-Control', 'public, max-age=300');
    return this.exercises.list();
  }

  @Get(':id')
  get(@Req() request: Request, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    this.assertNoQuery(request);
    const exercise = this.exercises.get(id);
    response.setHeader('Cache-Control', 'public, max-age=300');
    return exercise;
  }

  private assertNoQuery(request: Request): void {
    const url = new URL(request.originalUrl, 'http://localhost');
    if (url.search.length > 0) {
      throw new BadRequestException({ code: 'UNSUPPORTED_QUERY', message: 'Exercise guide endpoints do not accept query parameters.' });
    }
  }
}
