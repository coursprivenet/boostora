import { Module } from "@nestjs/common";
import { ExchangeRateModule } from "../exchange-rate/exchange-rate.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { CatalogService } from "./catalog.service";
import { CatalogController } from "./catalog.controller";

@Module({
  imports: [ExchangeRateModule, AuditLogModule],
  providers: [CatalogService],
  controllers: [CatalogController],
  exports: [CatalogService],
})
export class CatalogModule {}
