import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthResponseDto } from "./health.dto.js";

@Controller("health")
@ApiTags("Health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Check API liveness" })
  @ApiOkResponse({
    type: HealthResponseDto,
    description: "API is running; this is not a database-readiness check.",
  })
  getHealth() {
    return { status: "ok", service: "replens-api" };
  }
}
