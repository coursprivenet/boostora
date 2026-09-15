import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { CouponsService } from "./coupons.service";
import { UpsertCouponDto } from "./dto/upsert-coupon.dto";
import { PreviewCouponDto } from "./dto/preview-coupon.dto";

@Controller("coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  /** Any authenticated client can preview a code at checkout — nothing is persisted here. */
  @Post("preview")
  preview(@CurrentUser() user: AuthenticatedUser, @Body() dto: PreviewCouponDto) {
    return this.coupons.preview(user.id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  listAll() {
    return this.coupons.listAll();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: UpsertCouponDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coupons.create(dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: Partial<UpsertCouponDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coupons.update(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coupons.remove(id, user.id);
  }
}
