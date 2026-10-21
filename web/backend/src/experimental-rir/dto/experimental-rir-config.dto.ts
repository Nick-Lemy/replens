import { ApiProperty } from "@nestjs/swagger";

export class ExperimentalRirConfigDto {
  @ApiProperty({ example: true, enum: [true] })
  synthetic!: true;

  @ApiProperty({ example: false, enum: [false] })
  deploymentApproved!: false;

  @ApiProperty({ example: "synthetic-rir-speed-only-v1" })
  version!: string;

  @ApiProperty({
    example: "/api/experimental-rir/assets/synthetic-rir-speed-only-v1/model.onnx",
  })
  modelUrl!: string;

  @ApiProperty({
    example: "7c734ec947b86df655635a9bca5058801fb7c63fedf9049eb3a82caf6bdbb627",
  })
  sha256!: string;

  @ApiProperty({ example: "features" })
  inputName!: string;

  @ApiProperty({
    type: [String],
    example: ["mean_up_speed_deg_s", "peak_up_speed_deg_s"],
    description:
      "The selected bundle's ordered inputs. The speed-movement bundle adds movement_instability as the third input.",
  })
  featureOrder!: string[];

  @ApiProperty({ example: "synthetic-pilot-angular-v1" })
  featureDefinitionVersion!: string;

  @ApiProperty({
    example:
      "SYNTHETIC ONLY: software check, not research evidence or a deployable RIR model.",
  })
  notice!: string;
}
