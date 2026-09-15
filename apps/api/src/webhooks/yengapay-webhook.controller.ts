import {
  Controller,
  Headers,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RawBodyRequest } from "@nestjs/common";
import { Request } from "express";
import * as crypto from "crypto";
import { OrderStatus, PaymentStatus, WebhookSource } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators/public.decorator";
import { YengapayPaymentWebhook } from "../yengapay/yengapay.types";

@Controller("webhooks/yengapay")
export class YengapayWebhookController {
  private readonly logger = new Logger(YengapayWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.webhookSecret = config.get<string>("YENGAPAY_WEBHOOK_SECRET")!;
  }

  @Public()
  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-webhook-hash") signature: string | undefined,
    @Headers("x-yengapay-event") eventType: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw || !signature) {
      throw new UnauthorizedException("Signature manquante");
    }

    const expected = crypto.createHmac("sha256", this.webhookSecret).update(raw).digest("hex");
    const signatureValid =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    const body = JSON.parse(raw.toString("utf8"));

    if (!signatureValid) {
      this.logger.warn(`Yengapay webhook signature mismatch (event=${eventType ?? "unknown"})`);
      throw new UnauthorizedException("Signature invalide");
    }

    // Yengapay does not document a payment.success delivery-idempotency guarantee
    // (only payout.* has one) — dedupe defensively on our side regardless.
    const isPayoutEvent = eventType?.startsWith("payout.") ?? typeof body.status === "string";
    if (isPayoutEvent) {
      // Payouts (manual refunds) are handled in a later phase — ack and ignore for now.
      this.logger.log(`Ignoring payout webhook (event=${eventType})`);
      return { received: true };
    }

    await this.handlePaymentSuccess(body as YengapayPaymentWebhook);
    return { received: true };
  }

  private async handlePaymentSuccess(body: YengapayPaymentWebhook) {
    const externalEventId = body.transId;

    const alreadyProcessed = await this.prisma.webhookEvent.findUnique({
      where: { source_externalEventId: { source: WebhookSource.YENGAPAY, externalEventId } },
    });
    if (alreadyProcessed) {
      this.logger.log(`Duplicate Yengapay webhook ignored (transId=${externalEventId})`);
      return;
    }

    await this.prisma.webhookEvent.create({
      data: {
        source: WebhookSource.YENGAPAY,
        externalEventId,
        signatureValid: true,
        processedAt: new Date(),
        rawPayload: body as unknown as object,
      },
    });

    // reference is the order id we sent as `reference` when creating the payment intent.
    const payment = await this.prisma.payment.findUnique({ where: { reference: body.reference } });
    if (!payment) {
      this.logger.warn(`Yengapay webhook for unknown reference=${body.reference}`);
      return;
    }

    if (payment.status === PaymentStatus.PAID) {
      // Already confirmed synchronously via the /pay response — nothing to do.
      return;
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          rawWebhookPayload: body as unknown as object,
        },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PAID,
          paidAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`Order ${payment.orderId} confirmed PAID via webhook (transId=${externalEventId})`);
  }
}
