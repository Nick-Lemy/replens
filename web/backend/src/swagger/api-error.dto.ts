import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiErrorDto {
  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ example: "INVALID_REQUEST" })
  code?: string;

  @ApiPropertyOptional({ example: 400 })
  statusCode?: number;

  @ApiPropertyOptional({ example: "Bad Request" })
  error?: string;
}
