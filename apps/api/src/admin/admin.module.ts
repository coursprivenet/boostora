import { Module } from "@nestjs/common";
import { AdminStatsService } from "./admin-stats.service";
import { AdminStatsController } from "./admin-stats.controller";

@Module({
  providers: [AdminStatsService],
  controllers: [AdminStatsController],
})
export class AdminModule {}
