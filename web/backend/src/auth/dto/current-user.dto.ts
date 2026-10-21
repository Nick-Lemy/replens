import { ApiProperty } from "@nestjs/swagger";

export class CurrentUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ oneOf: [{ type: "string" }, { type: "null" }] })
  image!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({ type: CurrentUserDto })
  user!: CurrentUserDto;

  @ApiProperty({ type: "object", properties: { requiresPassword: { type: "boolean" }, recentSessionAllowed: { type: "boolean" } } })
  accountDeletion!: { requiresPassword: boolean; recentSessionAllowed: boolean };
}

export class AuthProvidersResponseDto {
  @ApiProperty({ example: true })
  emailPasswordEnabled!: boolean;

  @ApiProperty({ type: [String], enum: ["google"], example: ["google"] })
  socialProviders!: string[];
}
