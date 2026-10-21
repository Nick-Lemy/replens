import { Module } from "@nestjs/common";
import { ExperimentalRirController } from "./experimental-rir.controller.js";
import { ExperimentalRirService } from "./experimental-rir.service.js";

@Module({
  controllers: [ExperimentalRirController],
  providers: [ExperimentalRirService],
})
export class ExperimentalRirModule {}
