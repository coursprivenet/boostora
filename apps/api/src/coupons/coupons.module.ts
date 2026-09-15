import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { CouponsService } from "./coupons.service";
import { CouponsController } from "./coupons.controller";

@Module({
  imports: [CatalogModule, AuditLogModule],
  providers: [CouponsService],
  controllers: [CouponsController],
  exports: [CouponsService],
})
export class CouponsModule {}
