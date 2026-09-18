import { Controller, Post, Req, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RawBodyRequest } from "@nestjs/common";
import { Request } from "express";
import * as crypto from "crypto";
import { Public } from "../auth/decorators/public.decorator";
import { OrdersService } from "../orders/orders.service";
import { CryptomusPaymentWebhook } from "../cryptomus/cryptomus.types";

@Controller("webhooks/cryptomus")
export class CryptomusWebhookController {
  private readonly paymentApiKey?: string;

  constructor(
    private readonly orders: OrdersService,
    config: ConfigService,
  ) {
    this.paymentApiKey = config.get<string>("CRYPTOMUS_PAYMENT_API_KEY");
  }

  @Public()
  @Post()
  async handle(@Req() req: RawBodyRequest<Request>) {
    if (!this.paymentApiKey || !req.rawBody) {
      throw new UnauthorizedException("Webhook Cryptomus indisponible");
    }
    const body = JSON.parse(req.rawBody.toString("utf8")) as CryptomusPaymentWebhook;
    const received = body.sign;
    if (!received) throw new UnauthorizedException("Signature manquante");

    // Cryptomus signs the JSON payload without `sign`, escaping forward slashes like
    // PHP json_encode does (their documented algorithm).
    const unsigned = { ...body } as Record<string, unknown>;
    delete unsigned.sign;
    const serialized = JSON.stringify(unsigned).replace(/\//g, "\\/");
    const expected = crypto
      .createHash("md5")
      .update(`${Buffer.from(serialized).toString("base64")}${this.paymentApiKey}`)
      .digest("hex");
    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
    ) {
      throw new UnauthorizedException("Signature Cryptomus invalide");
    }

    await this.orders.confirmCryptomusPaymentFromWebhook(body);
    return { received: true };
  }
}
