import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  COUNTER_VERSION,
  COUNTER_VERSIONS,
} from "../workout-session.validation.js";

export class CreateWorkoutSessionDto {
  @ApiProperty({
    format: "uuid",
    description: "Stable client-generated idempotency key.",
  })
  clientId!: string;

  @ApiPropertyOptional({
    enum: COUNTER_VERSIONS,
    default: COUNTER_VERSION,
    description:
      "Client counter implementation version. Omitted values use the legacy version.",
  })
  counterVersion?: (typeof COUNTER_VERSIONS)[number];

  @ApiProperty({ format: "date-time" })
  startedAt!: string;

  @ApiProperty({ format: "date-time" })
  endedAt!: string;

  @ApiProperty({ type: "integer", minimum: 0, maximum: 1000 })
  completedReps!: number;

  @ApiProperty()
  interrupted!: boolean;
}
