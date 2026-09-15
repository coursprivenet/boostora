import {
  Controller,
  Headers,
  Logger,
  Post,
  Req,
  RawBodyRequest,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import * as crypto from "crypto";
import { WebhookSource } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators/public.decorator";
import { OrdersService } from "../orders/orders.service";
import { PanelFollowsWebhookEvent } from "../panelfollows/panelfollows.types";

const SIGNATURE_MAX_AGE_SECONDS = 300;

@Controller("webhooks/panelfollows")
export class PanelFollowsWebhookController {
  private readonly logger = new Logger(PanelFollowsWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    config: ConfigService,
  ) {
    this.webhookSecret = config.get<string>("PANELFOLLOWS_WEBHOOK_SECRET")!;
  }

  @Public()
  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("webhook-signature") signatureHeader: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw || !signatureHeader) {
      throw new UnauthorizedException("Signature manquante");
    }

    const match = /t=(\d+),v1=([0-9a-f]+)/.exec(signatureHeader);
    if (!match) {
      throw new UnauthorizedException("Signature malformée");
    }
    const [, timestamp, signature] = match;

    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_MAX_AGE_SECONDS) {
      throw new UnauthorizedException("Signature expirée (anti-replay)");
    }

    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${timestamp}.${raw.toString("utf8")}`)
      .digest("hex");
    const valid =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    if (!valid) {
      this.logger.warn("PanelFollows webhook signature mismatch");
      throw new UnauthorizedException("Signature invalide");
    }

    const event = JSON.parse(raw.toString("utf8")) as PanelFollowsWebhookEvent;

    const alreadyProcessed = await this.prisma.webhookEvent.findUnique({
      where: { source_externalEventId: { source: WebhookSource.PANELFOLLOWS, externalEventId: event.id } },
    });
    if (alreadyProcessed) {
      this.logger.log(`Duplicate PanelFollows webhook ignored (id=${event.id})`);
      return { received: true };
    }

    await this.prisma.webhookEvent.create({
      data: {
        source: WebhookSource.PANELFOLLOWS,
        externalEventId: event.id,
        signatureValid: true,
        processedAt: new Date(),
        rawPayload: event as unknown as object,
      },
    });

    await this.dispatch(event);
    return { received: true };
  }

  private async dispatch(event: PanelFollowsWebhookEvent) {
    switch (event.type) {
      case "order.created":
      case "order.processing":
      case "order.completed":
      case "order.partial":
      case "order.canceled":
      case "order.updated":
        if (event.data.order) {
          await this.orders.applyProviderOrderUpdate(event.data.order.id, event.data.order);
        }
        break;
      case "refill.created":
      case "refill.updated":
        if (event.data.refill) {
          await this.orders.applyRefillUpdate(event.data.refill.id, event.data.refill.status);
        }
        break;
      case "account.low_balance":
        this.logger.warn("PanelFollows account balance is below the configured alert threshold");
        break;
    }
  }
}
