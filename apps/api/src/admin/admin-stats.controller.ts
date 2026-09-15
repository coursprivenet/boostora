import { Controller, Get } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { AdminStatsService } from "./admin-stats.service";

@Controller("admin/stats")
@Roles(UserRole.ADMIN)
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  getOverview() {
    return this.stats.getOverview();
  }
}
