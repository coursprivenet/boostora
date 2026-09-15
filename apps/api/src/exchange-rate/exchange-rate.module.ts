import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { ExchangeRateService } from "./exchange-rate.service";
import { ExchangeRateController } from "./exchange-rate.controller";

@Module({
  imports: [AuditLogModule],
  providers: [ExchangeRateService],
  controllers: [ExchangeRateController],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
