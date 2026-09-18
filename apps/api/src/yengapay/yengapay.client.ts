import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import {
  YengapayApiError,
  YengapayArticle,
  YengapayCheckoutInitResponse,
  YengapayInitResponse,
  YengapayPayResponse,
  YengapaySendOtpResponse,
} from "./yengapay.types";

/**
 * Direct-payment (in-app) flow only — see Notion doc "Paiement direct". Never expose
 * YENGAPAY_API_KEY or the raw responses of this client to the frontend; the controller
 * layer re-shapes everything before it reaches the client.
 */
@Injectable()
export class YengapayClient {
  private readonly logger = new Logger(YengapayClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly organizationId: string;
  private readonly projectId: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>("YENGAPAY_BASE_URL")!;
    this.apiKey = config.get<string>("YENGAPAY_API_KEY")!;
    this.organizationId = config.get<string>("YENGAPAY_ORGANIZATION_ID")!;
    this.projectId = config.get<string>("YENGAPAY_PROJECT_ID")!;
  }

  async initDirectPayment(params: {
    amount: number;
    articles: YengapayArticle[];
    reference: string;
    customerEmailToNotify?: string;
  }): Promise<YengapayInitResponse> {
    return this.request<YengapayInitResponse>(
      `/groups/${this.organizationId}/projects/${this.projectId}/direct-payment/init`,
      params,
    );
  }

  async initCheckoutPayment(params: {
    amount: number;
    articles: YengapayArticle[];
    reference: string;
  }): Promise<YengapayCheckoutInitResponse> {
    return this.request<YengapayCheckoutInitResponse>(
      `/groups/${this.organizationId}/payment-intent/${this.projectId}`,
      {
        paymentAmount: params.amount,
        reference: params.reference,
        articles: params.articles,
      },
    );
  }

  async sendOtp(params: {
    paymentIntentId: string;
    operatorCode: string;
    countryCode: string;
    customerMSISDN: string;
  }): Promise<YengapaySendOtpResponse> {
    return this.request<YengapaySendOtpResponse>(
      `/groups/${this.organizationId}/projects/${this.projectId}/direct-payment/send-otp`,
      params,
    );
  }

  async pay(params: {
    paymentIntentId: string;
    operatorCode: string;
    countryCode: string;
    customerMSISDN: string;
    otp: string;
  }): Promise<YengapayPayResponse> {
    return this.request<YengapayPayResponse>(
      `/groups/${this.organizationId}/projects/${this.projectId}/direct-payment/pay`,
      params,
    );
  }

  /**
   * Reconciliation fallback (GET status of a completed/attempted direct payment).
   * Response shape is NOT documented beyond the curl example — treat as opaque until
   * verified against a real response, do not assume fields beyond what you observe.
   */
  async getPaymentStatus(paymentId: string): Promise<unknown> {
    return this.request<unknown>(
      `/groups/${this.organizationId}/merchant-payment/project/${this.projectId}/payment/${paymentId}`,
      undefined,
      "GET",
    );
  }

  private async request<T>(
    path: string,
    data?: unknown,
    method: "GET" | "POST" = "POST",
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.request<T>({
          baseURL: this.baseUrl,
          url: path,
          method,
          data,
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          timeout: 20_000,
        }),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status ?? 0;
      const body = axiosErr.response?.data;
      this.logger.warn(`Yengapay ${method} ${path} -> ${status}: ${JSON.stringify(body)}`);
      throw new YengapayApiError(status, axiosErr.message, body);
    }
  }
}
