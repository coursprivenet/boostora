import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { YengapayWebhookController } from "./yengapay-webhook.controller";
import { PanelFollowsWebhookController } from "./panelfollows-webhook.controller";
import { CryptomusWebhookController } from "./cryptomus-webhook.controller";

@Module({
  imports: [OrdersModule],
  controllers: [YengapayWebhookController, PanelFollowsWebhookController, CryptomusWebhookController],
})
export class WebhooksModule {}
