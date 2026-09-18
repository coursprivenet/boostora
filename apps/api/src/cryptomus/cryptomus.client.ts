import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import * as crypto from "crypto";
import { firstValueFrom } from "rxjs";
import { CryptomusApiError, CryptomusInvoiceResponse } from "./cryptomus.types";

/**
 * Cryptomus merchant-payment client. Its credentials are deliberately optional at
 * boot: the rest of the checkout must keep working while the merchant is in
 * Cryptomus moderation. Calling it without approved credentials is rejected clearly.
 */
@Injectable()
export class CryptomusClient {
  private readonly logger = new Logger(CryptomusClient.name);
  private readonly merchantId?: string;
  private readonly paymentApiKey?: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.merchantId = config.get<string>("CRYPTOMUS_MERCHANT_ID");
    this.paymentApiKey = config.get<string>("CRYPTOMUS_PAYMENT_API_KEY");
  }

  isConfigured() {
    return Boolean(this.merchantId && this.paymentApiKey);
  }

  async createInvoice(params: {
    amountUsd: string;
    orderId: string;
    callbackUrl: string;
    returnUrl: string;
    successUrl: string;
  }): Promise<CryptomusInvoiceResponse> {
    this.requireConfiguration();
    return this.request<CryptomusInvoiceResponse>("/v1/payment", {
      amount: params.amountUsd,
      currency: "USD",
      // Start with USDT on TRON: it is the clearest, lowest-friction stablecoin
      // choice for the intended audience. More assets can be enabled later.
      to_currency: "USDT",
      network: "tron",
      order_id: `crypto-${params.orderId}`,
      url_callback: params.callbackUrl,
      url_return: params.returnUrl,
      url_success: params.successUrl,
      lifetime: 900,
      is_payment_multiple: false,
    });
  }

  private requireConfiguration() {
    if (!this.merchantId || !this.paymentApiKey) {
      throw new ServiceUnavailableException("Le paiement crypto sera disponible après validation Cryptomus");
    }
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const payload = JSON.stringify(body);
    const sign = crypto.createHash("md5").update(`${Buffer.from(payload).toString("base64")}${this.paymentApiKey}`).digest("hex");
    try {
      const response = await firstValueFrom(
        this.http.post<{ state: number; result: T }>(`https://api.cryptomus.com${path}`, body, {
          headers: { merchant: this.merchantId!, sign, "Content-Type": "application/json" },
          timeout: 20_000,
        }),
      );
      if (response.data.state !== 0) {
        throw new CryptomusApiError(502, "Cryptomus a refusé la création de la facture", response.data);
      }
      return response.data.result;
    } catch (err) {
      if (err instanceof CryptomusApiError) throw err;
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status ?? 0;
      const body = axiosErr.response?.data;
      this.logger.warn(`Cryptomus POST ${path} -> ${status}: ${JSON.stringify(body)}`);
      throw new CryptomusApiError(status, axiosErr.message, body);
    }
  }
}
