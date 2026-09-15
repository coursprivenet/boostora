import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PanelFollowsClient } from "../panelfollows/panelfollows.client";
import { PanelFollowsService } from "../panelfollows/panelfollows.types";

export interface SyncSummary {
  fetched: number;
  created: number;
  updated: number;
  deactivated: number;
}

@Injectable()
export class ProviderServicesService {
  private readonly logger = new Logger(ProviderServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly panelFollows: PanelFollowsClient,
  ) {}

  listAll() {
    return this.prisma.providerService.findMany({ orderBy: { name: "asc" } });
  }

  /**
   * Mirrors PanelFollows' catalog into ProviderService. Never touches CatalogService —
   * applying a provider price/availability change to what the client sees is a separate,
   * explicit step (see CatalogModule), never automatic.
   */
  async syncFromPanelFollows(): Promise<SyncSummary> {
    const remoteServices = await this.panelFollows.listAllServices();
    const remoteIds = new Set(remoteServices.map((s) => s.id));

    let created = 0;
    let updated = 0;

    for (const svc of remoteServices) {
      const data = this.toProviderServiceData(svc);
      const existing = await this.prisma.providerService.findUnique({
        where: { providerServiceId: svc.id },
      });

      if (existing) {
        await this.prisma.providerService.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.providerService.create({ data });
        created++;
      }
    }

    // Services that disappeared from the provider catalog: mark inactive, never delete
    // (a CatalogService may still reference them, and we want an admin to see why it broke).
    const localActive = await this.prisma.providerService.findMany({
      where: { isActiveUpstream: true },
      select: { id: true, providerServiceId: true },
    });
    const goneIds = localActive
      .filter((s) => !remoteIds.has(s.providerServiceId))
      .map((s) => s.id);

    if (goneIds.length > 0) {
      await this.prisma.providerService.updateMany({
        where: { id: { in: goneIds } },
        data: { isActiveUpstream: false },
      });
    }

    this.logger.log(
      `Sync done: fetched=${remoteServices.length} created=${created} updated=${updated} deactivated=${goneIds.length}`,
    );

    return {
      fetched: remoteServices.length,
      created,
      updated,
      deactivated: goneIds.length,
    };
  }

  private toProviderServiceData(svc: PanelFollowsService) {
    return {
      providerServiceId: svc.id,
      name: svc.name,
      description: svc.description,
      type: svc.type,
      platform: svc.platform,
      categorySlug: svc.category.slug,
      categoryName: svc.category.name,
      rateUsd: svc.pricing.rate,
      unit: svc.pricing.unit,
      minQuantity: svc.limits.min,
      maxQuantity: svc.limits.max,
      refillSupported: svc.features.refill,
      cancelSupported: svc.features.cancel,
      dripfeedSupported: svc.features.dripfeed,
      averageTimeSeconds: svc.average_time_seconds,
      fieldsSchema: svc.fields as unknown as object,
      isActiveUpstream: svc.is_active,
      lastSyncedAt: new Date(),
    };
  }
}
