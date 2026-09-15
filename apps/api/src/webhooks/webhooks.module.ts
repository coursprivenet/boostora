import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { YengapayWebhookController } from "./yengapay-webhook.controller";
import { PanelFollowsWebhookController } from "./panelfollows-webhook.controller";

@Module({
  imports: [OrdersModule],
  controllers: [YengapayWebhookController, PanelFollowsWebhookController],
})
export class WebhooksModule {}
