import { Module } from "@nestjs/common";
import { YengapayWebhookController } from "./yengapay-webhook.controller";

@Module({
  controllers: [YengapayWebhookController],
})
export class WebhooksModule {}
