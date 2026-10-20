import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ExercisePhotoSetDto {
  @ApiProperty({ type: [String], format: "uri" })
  images!: string[];

  @ApiProperty({ format: "uri" })
  sourceUrl!: string;

  @ApiProperty()
  credit!: string;

  @ApiProperty({ format: "uri" })
  creditUrl!: string;

  @ApiProperty()
  license!: string;

  @ApiProperty({ format: "uri" })
  licenseUrl!: string;

  @ApiPropertyOptional()
  variation?: string;
}

export class ExerciseGuideDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ["Arms", "Chest", "Back", "Shoulders", "Legs", "Core"] })
  group!: string;

  @ApiProperty()
  equipment!: string;

  @ApiProperty()
  focus!: string;

  @ApiProperty({
    type: "array",
    items: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 2,
    },
    description: "Ordered [step title, instruction] pairs.",
  })
  steps!: [string, string][];

  @ApiProperty({ type: [String] })
  tips!: string[];

  @ApiProperty({ format: "uri" })
  referenceUrl!: string;

  @ApiProperty()
  referenceLabel!: string;

  @ApiProperty()
  cameraPreview!: boolean;

  @ApiProperty({ type: ExercisePhotoSetDto })
  photos!: ExercisePhotoSetDto;
}

export class ExerciseGuideListDto {
  @ApiProperty({ type: [ExerciseGuideDto] })
  items!: ExerciseGuideDto[];

  @ApiProperty({
    type: [String],
    example: ["All", "Arms", "Chest", "Back", "Shoulders", "Legs", "Core"],
  })
  groups!: string[];
}
