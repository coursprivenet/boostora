import { Body, Controller, Get, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { ExchangeRateService } from "./exchange-rate.service";
import { SetExchangeRateDto } from "./dto/set-exchange-rate.dto";

@Controller("exchange-rate")
@Roles(UserRole.ADMIN)
export class ExchangeRateController {
  constructor(private readonly service: ExchangeRateService) {}

  @Get("current")
  async current() {
    const rate = await this.service.getCurrentRate();
    return { rateXofPerUsd: rate.toString() };
  }

  @Get("history")
  history() {
    return this.service.history();
  }

  @Post()
  set(@Body() dto: SetExchangeRateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setRate(dto.rateXofPerUsd, user.id);
  }
}
