import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { CatalogService } from "./catalog.service";
import { UpsertCatalogServiceDto } from "./dto/upsert-catalog-service.dto";
import { PricePreviewQueryDto } from "./dto/price-preview-query.dto";

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

  @Roles(UserRole.ADMIN)
  @Get(":id/admin-price-preview")
  adminPricePreview(@Param("id") id: string, @Query() query: PricePreviewQueryDto) {
    return this.catalog.previewAdminPrice(id, query.quantity);
  }

  @Public()
  @Get(":id")
  getPublicOne(@Param("id") id: string) {
    return this.catalog.getPublicOne(id);
  }

  /** Live checkout price as the client adjusts quantity — never persists anything. */
  @Public()
  @Get(":id/price-preview")
  pricePreview(@Param("id") id: string, @Query() query: PricePreviewQueryDto) {
    return this.catalog.previewPrice(id, query.quantity);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: UpsertCatalogServiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.create(dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: Partial<UpsertCatalogServiceDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalog.update(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.remove(id, user.id);
  }
}
