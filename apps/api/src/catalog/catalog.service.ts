import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import Decimal from "decimal.js";
import { PrismaService } from "../prisma/prisma.service";
import { ExchangeRateService } from "../exchange-rate/exchange-rate.service";
import { computePrice } from "../pricing/pricing.util";
import { UpsertCatalogServiceDto } from "./dto/upsert-catalog-service.dto";

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRate: ExchangeRateService,
  ) {}

  async create(dto: UpsertCatalogServiceDto) {
    const providerService = await this.getProviderServiceOrThrow(dto.providerServiceId);
    await this.getCategoryOrThrow(dto.categoryId);
    this.validateQuantityOverrides(dto, providerService);

    return this.prisma.catalogService.create({ data: dto });
  }

  async update(id: string, dto: Partial<UpsertCatalogServiceDto>) {
    const existing = await this.prisma.catalogService.findUnique({
      where: { id },
      include: { providerService: true },
    });
    if (!existing) throw new NotFoundException("Service catalogue introuvable");

    if (dto.categoryId) await this.getCategoryOrThrow(dto.categoryId);

    const providerService = dto.providerServiceId
      ? await this.getProviderServiceOrThrow(dto.providerServiceId)
      : existing.providerService;

    this.validateQuantityOverrides(
      { ...existing, ...dto } as UpsertCatalogServiceDto,
      providerService,
    );

    return this.prisma.catalogService.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.catalogService.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Service catalogue introuvable");
    return this.prisma.catalogService.delete({ where: { id } });
  }

  /**
   * Prices one actual order. Unlike listPublic/listAdmin (which show a per-1000 or
   * per-order REFERENCE price for the catalog grid), this scales the provider cost to
   * the requested quantity BEFORE applying the margin rule and rounding — rounding a
   * unit price then multiplying it by an arbitrary quantity would compound the rounding
   * error instead of bounding it once, on the number the client actually pays.
   */
  async computeOrderPrice(catalogServiceId: string, quantity: number) {
    const [service, fxRate] = await Promise.all([
      this.prisma.catalogService.findUnique({
        where: { id: catalogServiceId },
        include: { providerService: true },
      }),
      this.exchangeRate.getCurrentRate(),
    ]);

    if (!service || !service.isVisible || !service.providerService.isActiveUpstream) {
      throw new NotFoundException("Service indisponible");
    }

    const min = service.minQuantityOverride ?? service.providerService.minQuantity;
    const max = service.maxQuantityOverride ?? service.providerService.maxQuantity;
    if (quantity < min || quantity > max) {
      throw new BadRequestException(`Quantité invalide (min ${min}, max ${max})`);
    }

    const quantityFactor =
      service.providerService.unit === "per_1000" ? new Decimal(quantity).div(1000) : new Decimal(1);
    const costUsdForOrder = new Decimal(service.providerService.rateUsd.toString()).mul(quantityFactor);

    const price = computePrice({
      pricingRuleType: service.pricingRuleType,
      pricingValue: service.pricingValue.toString(),
      costUsd: costUsdForOrder,
      fxRateXofPerUsd: fxRate,
      roundingStep: service.roundingStep?.toString(),
      minPriceXof: service.minPriceXof?.toString(),
      maxPriceXof: service.maxPriceXof?.toString(),
    });

    return {
      catalogService: service,
      providerService: service.providerService,
      quantity,
      fxRateUsed: fxRate,
      priceClientXof: price.priceClientXof.toDecimalPlaces(0),
      costProviderXof: price.costProviderXof.toDecimalPlaces(0),
      costProviderUsd: costUsdForOrder,
      marginXof: price.marginXof.toDecimalPlaces(0),
    };
  }

  /** Admin view: exposes provider cost and margin. Never return this shape to a client. */
  async listAdmin() {
    const [services, fxRate] = await Promise.all([
      this.prisma.catalogService.findMany({
        include: { providerService: true, category: true },
        orderBy: { displayOrder: "asc" },
      }),
      this.exchangeRate.getCurrentRate(),
    ]);

    return services.map((s) => {
      const price = computePrice({
        pricingRuleType: s.pricingRuleType,
        pricingValue: s.pricingValue.toString(),
        costUsd: s.providerService.rateUsd.toString(),
        fxRateXofPerUsd: fxRate,
        roundingStep: s.roundingStep?.toString(),
        minPriceXof: s.minPriceXof?.toString(),
        maxPriceXof: s.maxPriceXof?.toString(),
      });

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        isVisible: s.isVisible,
        displayOrder: s.displayOrder,
        provider: {
          providerServiceId: s.providerService.providerServiceId,
          platform: s.providerService.platform,
          rateUsd: s.providerService.rateUsd.toString(),
          unit: s.providerService.unit,
          isActiveUpstream: s.providerService.isActiveUpstream,
          minQuantity: s.providerService.minQuantity,
          maxQuantity: s.providerService.maxQuantity,
        },
        minQuantity: s.minQuantityOverride ?? s.providerService.minQuantity,
        maxQuantity: s.maxQuantityOverride ?? s.providerService.maxQuantity,
        fxRateUsed: fxRate.toString(),
        priceClientXof: price.priceClientXof.toDecimalPlaces(0).toString(),
        costProviderXof: price.costProviderXof.toDecimalPlaces(0).toString(),
        marginXof: price.marginXof.toDecimalPlaces(0).toString(),
      };
    });
  }

  /** Public view: our brand only, no provider id, no cost, no margin. */
  async listPublic() {
    const [services, fxRate] = await Promise.all([
      this.prisma.catalogService.findMany({
        where: { isVisible: true, providerService: { isActiveUpstream: true } },
        include: { providerService: true, category: true },
        orderBy: { displayOrder: "asc" },
      }),
      this.exchangeRate.getCurrentRate(),
    ]);

    return services.map((s) => {
      const price = computePrice({
        pricingRuleType: s.pricingRuleType,
        pricingValue: s.pricingValue.toString(),
        costUsd: s.providerService.rateUsd.toString(),
        fxRateXofPerUsd: fxRate,
        roundingStep: s.roundingStep?.toString(),
        minPriceXof: s.minPriceXof?.toString(),
        maxPriceXof: s.maxPriceXof?.toString(),
      });

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        category: { slug: s.category.slug, name: s.category.name },
        platform: s.providerService.platform,
        unit: s.providerService.unit,
        minQuantity: s.minQuantityOverride ?? s.providerService.minQuantity,
        maxQuantity: s.maxQuantityOverride ?? s.providerService.maxQuantity,
        priceClientXof: price.priceClientXof.toDecimalPlaces(0).toString(),
      };
    });
  }

  private async getProviderServiceOrThrow(id: string) {
    const providerService = await this.prisma.providerService.findUnique({ where: { id } });
    if (!providerService) throw new NotFoundException("Service fournisseur introuvable");
    return providerService;
  }

  private async getCategoryOrThrow(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Catégorie introuvable");
    return category;
  }

  private validateQuantityOverrides(
    dto: Pick<UpsertCatalogServiceDto, "minQuantityOverride" | "maxQuantityOverride">,
    providerService: { minQuantity: number; maxQuantity: number },
  ) {
    if (dto.minQuantityOverride != null && dto.minQuantityOverride < providerService.minQuantity) {
      throw new BadRequestException(
        `minQuantityOverride ne peut pas être inférieur au minimum fournisseur (${providerService.minQuantity})`,
      );
    }
    if (dto.maxQuantityOverride != null && dto.maxQuantityOverride > providerService.maxQuantity) {
      throw new BadRequestException(
        `maxQuantityOverride ne peut pas dépasser le maximum fournisseur (${providerService.maxQuantity})`,
      );
    }
  }
}
