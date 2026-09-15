import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CatalogService } from "./catalog.service";
import { UpsertCatalogServiceDto } from "./dto/upsert-catalog-service.dto";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  listPublic() {
    return this.catalog.listPublic();
  }

  @Roles(UserRole.ADMIN)
  @Get("admin")
  listAdmin() {
    return this.catalog.listAdmin();
  }

  @Public()
  @Get(":id")
  getPublicOne(@Param("id") id: string) {
    return this.catalog.getPublicOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: UpsertCatalogServiceDto) {
    return this.catalog.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<UpsertCatalogServiceDto>) {
    return this.catalog.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.catalog.remove(id);
  }
}
