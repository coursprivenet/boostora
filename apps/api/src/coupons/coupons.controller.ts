import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { CouponsService } from "./coupons.service";
import { UpsertCouponDto } from "./dto/upsert-coupon.dto";
import { PreviewCouponDto } from "./dto/preview-coupon.dto";

@Controller("coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  /** Any client (guest or authenticated) can preview a code at checkout — nothing is persisted here. */
  @Public()
  @Post("preview")
  preview(@CurrentUser() user: AuthenticatedUser | undefined, @Body() dto: PreviewCouponDto) {
    return this.coupons.preview(user?.id, dto);
  }

  /** Public — lets checkout hide the coupon field entirely when there's nothing to redeem. */
  @Public()
  @Get("exists")
  anyExist() {
    return this.coupons.anyRedeemableExist();
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
