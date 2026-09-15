import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import {
  PanelFollowsErrorBody,
  PanelFollowsListResponse,
  PanelFollowsOrder,
  PanelFollowsRefill,
  PanelFollowsService,
  PanelFollowsApiError,
} from "./panelfollows.types";

/**
 * Thin wrapper over PanelFollows v3. Never expose these responses directly to clients —
 * ProviderService (Prisma) is the only place provider data is allowed to land before
 * being re-shaped into our own CatalogService.
 */
@Injectable()
export class PanelFollowsClient {
  private readonly logger = new Logger(PanelFollowsClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>("PANELFOLLOWS_BASE_URL")!;
    this.apiKey = config.get<string>("PANELFOLLOWS_API_KEY")!;
  }

  /** Fetches every page of /services, following next_cursor until has_more is false. */
  async listAllServices(): Promise<PanelFollowsService[]> {
    const services: PanelFollowsService[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.listServicesPage(cursor);
      services.push(...page.data);
      cursor = page.next_cursor ?? undefined;
      if (!page.has_more) break;
    } while (cursor);

    return services;
  }

  async listServicesPage(
    startingAfter?: string,
    limit = 500,
  ): Promise<PanelFollowsListResponse<PanelFollowsService>> {
    const params: Record<string, string | number> = { limit };
    if (startingAfter) params.starting_after = startingAfter;

    return this.request<PanelFollowsListResponse<PanelFollowsService>>({
      method: "GET",
      url: "/services",
      params,
    });
  }

  async getService(providerServiceId: number): Promise<PanelFollowsService> {
    return this.request<PanelFollowsService>({
      method: "GET",
      url: `/services/${providerServiceId}`,
    });
  }

  /**
   * Creates a provider order. `extraFields` covers service.fields entries beyond
   * link/quantity (comments, runs/interval for drip-feed, username, ...) — we do not
   * yet collect those in our own checkout form, so only base services (link+quantity)
   * are actually orderable end-to-end today. Passing an Idempotency-Key is mandatory
   * here: it is what makes a retried submission after a network drop safe.
   */
  async createOrder(
    params: { service: number; link: string; quantity: number; [extraField: string]: unknown },
    idempotencyKey: string,
  ): Promise<PanelFollowsOrder> {
    return this.request<PanelFollowsOrder>({
      method: "POST",
      url: "/orders",
      data: params,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }

  async getOrder(providerOrderId: number): Promise<PanelFollowsOrder> {
    return this.request<PanelFollowsOrder>({
      method: "GET",
      url: `/orders/${providerOrderId}`,
    });
  }

  async cancelOrder(providerOrderId: number): Promise<unknown> {
    return this.request<unknown>({
      method: "POST",
      url: `/orders/${providerOrderId}/cancel`,
    });
  }

  async refillOrder(providerOrderId: number): Promise<PanelFollowsRefill> {
    return this.request<PanelFollowsRefill>({
      method: "POST",
      url: `/orders/${providerOrderId}/refill`,
    });
  }

  private async request<T>(opts: {
    method: "GET" | "POST";
    url: string;
    params?: Record<string, unknown>;
    data?: unknown;
    headers?: Record<string, string>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.request<T>({
          baseURL: this.baseUrl,
          method: opts.method,
          url: opts.url,
          params: opts.params,
          data: opts.data,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...opts.headers,
          },
          timeout: 15_000,
        }),
      );
      return response.data;
    } catch (err) {
      throw this.toApiError(err as AxiosError<PanelFollowsErrorBody>);
    }
  }

  private toApiError(err: AxiosError<PanelFollowsErrorBody>): PanelFollowsApiError {
    const status = err.response?.status ?? 0;
    const body = err.response?.data;

    if (body?.object === "error") {
      this.logger.warn(`PanelFollows ${status} ${body.error.code}: ${body.error.message}`);
      return new PanelFollowsApiError(body.error.code, status, body.error.message, body.error.request_id);
    }

    this.logger.error(`PanelFollows request failed: ${err.message}`);
    return new PanelFollowsApiError("network_error", status, err.message);
  }
}
