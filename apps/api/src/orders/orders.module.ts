import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { YengapayModule } from "../yengapay/yengapay.module";
import { PanelFollowsModule } from "../panelfollows/panelfollows.module";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { ProviderReconciliationService } from "./provider-reconciliation.service";

@Module({
  imports: [CatalogModule, YengapayModule, PanelFollowsModule],
  providers: [OrdersService, ProviderReconciliationService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
