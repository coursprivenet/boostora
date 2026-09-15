import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { YengapayModule } from "../yengapay/yengapay.module";
import { PanelFollowsModule } from "../panelfollows/panelfollows.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { CouponsModule } from "../coupons/coupons.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { ProviderReconciliationService } from "./provider-reconciliation.service";

@Module({
  imports: [
    CatalogModule,
    YengapayModule,
    PanelFollowsModule,
    AuditLogModule,
    CouponsModule,
    NotificationsModule,
  ],
  providers: [OrdersService, ProviderReconciliationService],
  controllers: [OrdersController],
  exports: [OrdersService, ProviderReconciliationService],
})
export class OrdersModule {}
