import { ApiProperty } from "@nestjs/swagger";

export class CreateWorkoutSessionDto {
  @ApiProperty({
    format: "uuid",
    description: "Stable client-generated idempotency key.",
  })
  clientId!: string;

  @ApiProperty({ format: "date-time" })
  startedAt!: string;

  @ApiProperty({ format: "date-time" })
  endedAt!: string;

  @ApiProperty({ type: "integer", minimum: 0, maximum: 1000 })
  completedReps!: number;

  @ApiProperty()
  interrupted!: boolean;
}
