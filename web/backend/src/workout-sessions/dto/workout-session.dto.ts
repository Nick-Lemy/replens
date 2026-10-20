import { ApiProperty } from "@nestjs/swagger";

export class WorkoutSessionDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "two-arm-dumbbell-curl" })
  exerciseId!: string;

  @ApiProperty({ example: "world-full-v1" })
  counterVersion!: string;

  @ApiProperty({ format: "date-time" })
  startedAt!: string;

  @ApiProperty({ format: "date-time" })
  endedAt!: string;

  @ApiProperty({ type: "integer", minimum: 0 })
  durationSeconds!: number;

  @ApiProperty({ type: "integer", minimum: 0, maximum: 1000 })
  completedReps!: number;

  @ApiProperty()
  interrupted!: boolean;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class WorkoutSessionPageDto {
  @ApiProperty({ type: [WorkoutSessionDto] })
  items!: WorkoutSessionDto[];

  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "null" }],
    description: "Opaque cursor for the next page.",
  })
  nextCursor!: string | null;
}
