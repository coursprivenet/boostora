import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { YengapayModule } from "../yengapay/yengapay.module";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";

@Module({
  imports: [CatalogModule, YengapayModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
