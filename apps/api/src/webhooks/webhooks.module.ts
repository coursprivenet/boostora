import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { YengapayWebhookController } from "./yengapay-webhook.controller";

@Module({
  imports: [OrdersModule],
  controllers: [YengapayWebhookController],
})
export class WebhooksModule {}
