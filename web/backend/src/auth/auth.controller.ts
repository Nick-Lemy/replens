import { Controller, Get, Header, Req, UnauthorizedException } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { AuthService } from "./auth.service.js";
import { AuthProvidersResponseDto, CurrentUserResponseDto } from "./dto/current-user.dto.js";

@Controller("me")
@ApiTags("Authentication")
@ApiCookieAuth("RepLensSessionCookie")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get()
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({ description: "Sign in required." })
  async currentUser(@Req() request: Request) {
    const session = await this.authService.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) throw new UnauthorizedException("Sign in to continue.");
    const accountDeletion = await this.authService.accountDeletionCapabilities(session.user.id);
    return { user: session.user, accountDeletion };
  }

}

@Controller("auth/providers")
@ApiTags("Authentication")
export class AuthProvidersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: AuthProvidersResponseDto, description: "Public authentication capabilities." })
  authenticationProviders() {
    return { emailPasswordEnabled: true, socialProviders: this.authService.googleEnabled ? ["google"] : [] };
  }
}
