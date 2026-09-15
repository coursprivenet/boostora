import { Controller, Get, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { ProviderServicesService } from "./provider-services.service";

@Controller("provider-services")
@Roles(UserRole.ADMIN)
export class ProviderServicesController {
  constructor(private readonly service: ProviderServicesService) {}

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Post("sync")
  sync() {
    return this.service.syncFromPanelFollows();
  }
}
