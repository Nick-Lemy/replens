import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';

@Controller('me')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get()
  async currentUser(@Req() request: Request) {
    const session = await this.authService.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new UnauthorizedException('Sign in to continue.');
    return { user: session.user };
  }
}
