import { ApiProperty } from "@nestjs/swagger";

export class TrackingConfigDto {
  @ApiProperty({ example: "1.1.1" })
  runtimeVersion!: string;

  @ApiProperty({
    example:
      "/api/tracking/assets/tasks-vision-1.1.1-pose-full-float16-1/pose_landmarker_full_v1.task",
  })
  modelUrl!: string;

  @ApiProperty({
    example: "/api/tracking/assets/tasks-vision-1.1.1-pose-full-float16-1/",
  })
  wasmRoot!: string;

  @ApiProperty({ example: "two-arm-dumbbell-curl" })
  exerciseId!: string;
}
