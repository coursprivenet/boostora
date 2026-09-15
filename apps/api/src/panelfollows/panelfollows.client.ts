import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import {
  PanelFollowsErrorBody,
  PanelFollowsListResponse,
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
