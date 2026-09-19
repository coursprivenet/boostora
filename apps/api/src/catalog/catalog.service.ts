import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import Decimal from "decimal.js";
import { PrismaService } from "../prisma/prisma.service";
import { ExchangeRateService } from "../exchange-rate/exchange-rate.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { computePrice } from "../pricing/pricing.util";
import { extractDripfeedLimits } from "../panelfollows/dripfeed.util";
import { UpsertCatalogServiceDto } from "./dto/upsert-catalog-service.dto";

type PriceQuote = ReturnType<typeof computePrice>;

const DEFAULT_PAYMENT_MINIMUM_XOF = new Decimal(100);

function paymentMinimumXof() {
  const configured = new Decimal(process.env.YENGAPAY_MIN_AMOUNT_XOF ?? "100");
  return configured.isFinite() && configured.gt(0) ? configured : DEFAULT_PAYMENT_MINIMUM_XOF;
}

/**
 * `minPriceXof = 100` is the historical payment floor, not an independent
 * commercial price floor. A larger value remains an explicit admin floor.
 */
function commercialMinimumPrice(minPriceXof?: Decimal.Value | null) {
  if (minPriceXof == null) return null;
  const minimum = new Decimal(minPriceXof);
  return minimum.gt(paymentMinimumXof()) ? minimum.toString() : null;
}

/**
 * Finds the first quantity whose un-floored price reaches the payment minimum.
 * That quantity becomes the real order minimum, so a public “100 F pour N”
 * statement always matches what checkout and the API accept.
 */
export function findPublicReferenceOffer(params: {
  unit: string;
  minQuantity: number;
  maxQuantity: number;
  priceFor: (quantity: number) => PriceQuote;
  priceWithoutMinimum: (quantity: number) => PriceQuote;
}) {
  let referenceQuantity = params.unit === "per_1000" ? params.minQuantity : 1;
  let price = params.priceFor(referenceQuantity);
  const paymentMinimum = paymentMinimumXof();
  if (params.unit !== "per_1000" || params.priceWithoutMinimum(referenceQuantity).priceClientXof.gte(paymentMinimum)) {
    return { referenceQuantity, price, minimumQuantity: params.minQuantity, paymentMinimumReached: false, paymentMinimumApplied: false };
  }

  // A capped or fixed-price offer can never naturally reach the payment floor.
  // Keep its technical minimum and let the payment layer show/apply the floor;
  // importantly, never invent a false quantity equivalence for it.
  if (params.priceWithoutMinimum(params.maxQuantity).priceClientXof.lt(paymentMinimum)) {
    price = {
      ...price,
      priceClientXof: paymentMinimum,
      marginXof: paymentMinimum.minus(price.costProviderXof),
    };
    return { referenceQuantity, price, minimumQuantity: params.minQuantity, paymentMinimumReached: false, paymentMinimumApplied: true };
  }

  let low = params.minQuantity;
  let high = params.maxQuantity;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (params.priceWithoutMinimum(middle).priceClientXof.gte(paymentMinimum)) high = middle;
    else low = middle + 1;
  }
  referenceQuantity = low;
  price = params.priceFor(referenceQuantity);
  return { referenceQuantity, price, minimumQuantity: referenceQuantity, paymentMinimumReached: true, paymentMinimumApplied: false };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRate: ExchangeRateService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Public-safe subset of computeOrderPrice — cost/margin never leave the server. */
  async previewPrice(catalogServiceId: string, quantity: number) {
    const priced = await this.computeOrderPrice(catalogServiceId, quantity);
    return { quantity, priceClientXof: priced.priceClientXof.toString() };
  }

  async create(dto: UpsertCatalogServiceDto, actorUserId: string) {
    const providerService = await this.getProviderServiceOrThrow(dto.providerServiceId);
    await this.getCategoryOrThrow(dto.categoryId);
    this.validateQuantityOverrides(dto, providerService);

    const created = await this.prisma.catalogService.create({ data: dto });
    await this.auditLog.record(actorUserId, "catalog.create", created.id, { name: dto.name });
    return created;
  }

  async update(id: string, dto: Partial<UpsertCatalogServiceDto>, actorUserId: string) {
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

    const { referencePriceXof, ...updateData } = dto;
    if (referencePriceXof != null) {
      const minQuantity = updateData.minQuantityOverride ?? existing.minQuantityOverride ?? providerService.minQuantity;
      const costUsdAtMinimum = new Decimal(providerService.rateUsd.toString()).mul(
        providerService.unit === "per_1000" ? new Decimal(minQuantity).div(1000) : 1,
      );
      const commercialCostXof = costUsdAtMinimum.mul(await this.exchangeRate.getCurrentRate());
      const pricingRuleType = updateData.pricingRuleType ?? existing.pricingRuleType;
      const referencePrice = new Decimal(referencePriceXof);
      const pricingValue = pricingRuleType === "PERCENT_MARGIN"
        ? referencePrice.div(commercialCostXof).minus(1).mul(100)
        : pricingRuleType === "FIXED_MARGIN"
          ? referencePrice.minus(commercialCostXof)
          : referencePrice;
      Object.assign(updateData, {
        pricingRuleType,
        pricingValue: pricingValue.toNumber(),
        // This preserves the requested amount if a small-order floor would otherwise win.
        minPriceXof: referencePrice.toNumber(),
      });
    }

    const updated = await this.prisma.catalogService.update({ where: { id }, data: updateData });
    await this.auditLog.record(actorUserId, "catalog.update", id, { ...updateData, referencePriceXof });
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.catalogService.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Service catalogue introuvable");
    const removed = await this.prisma.catalogService.delete({ where: { id } });
    await this.auditLog.record(actorUserId, "catalog.delete", id, { name: existing.name });
    return removed;
  }

  /**
   * Prices one actual order. Unlike listPublic/listAdmin (which show a per-1000 or
   * per-order REFERENCE price for the catalog grid), this scales the provider cost to
   * the requested quantity BEFORE applying the margin rule and rounding — rounding a
   * unit price then multiplying it by an arbitrary quantity would compound the rounding
   * error instead of bounding it once, on the number the client actually pays.
   */
  async computeOrderPrice(catalogServiceId: string, quantity: number, allowUnavailable = false) {
    const [service, fxRate] = await Promise.all([
      this.prisma.catalogService.findUnique({
        where: { id: catalogServiceId },
        include: { providerService: true },
      }),
      this.exchangeRate.getCurrentRate(),
    ]);

    if (!service || (!allowUnavailable && (!service.isVisible || !service.providerService.isActiveUpstream))) {
      throw new NotFoundException("Service indisponible");
    }

    const technicalMin = service.minQuantityOverride ?? service.providerService.minQuantity;
    const max = service.maxQuantityOverride ?? service.providerService.maxQuantity;
    const costUsdFor = (requestedQuantity: number) => new Decimal(service.providerService.rateUsd.toString()).mul(
      service.providerService.unit === "per_1000" ? new Decimal(requestedQuantity).div(1000) : 1,
    );
    const priceFor = (requestedQuantity: number) => computePrice({
      pricingRuleType: service.pricingRuleType,
      pricingValue: service.pricingValue.toString(),
      costUsd: costUsdFor(requestedQuantity),
      fxRateXofPerUsd: fxRate,
      roundingStep: service.roundingStep?.toString(),
      minPriceXof: commercialMinimumPrice(service.minPriceXof?.toString()),
      maxPriceXof: service.maxPriceXof?.toString(),
    });
    const priceWithoutMinimum = (requestedQuantity: number) => computePrice({
      pricingRuleType: service.pricingRuleType,
      pricingValue: service.pricingValue.toString(),
      costUsd: costUsdFor(requestedQuantity),
      fxRateXofPerUsd: fxRate,
      roundingStep: service.roundingStep?.toString(),
      minPriceXof: null,
      maxPriceXof: service.maxPriceXof?.toString(),
    });
    const reference = findPublicReferenceOffer({
      unit: service.providerService.unit,
      minQuantity: technicalMin,
      maxQuantity: max,
      priceFor,
      priceWithoutMinimum,
    });
    const min = reference.minimumQuantity;
    if (quantity < min || quantity > max) {
      throw new BadRequestException(`Quantité invalide (min ${min}, max ${max})`);
    }

    const costUsdForOrder = costUsdFor(quantity);
    let price = priceFor(quantity);
    if (reference.paymentMinimumApplied && price.priceClientXof.lt(paymentMinimumXof())) {
      price = {
        ...price,
        priceClientXof: paymentMinimumXof(),
        marginXof: paymentMinimumXof().minus(price.costProviderXof),
      };
    }

    return {
      catalogService: service,
      providerService: service.providerService,
      quantity,
      minimumQuantity: min,
      fxRateUsed: fxRate,
      priceClientXof: price.priceClientXof.toDecimalPlaces(0),
      costProviderXof: price.costProviderXof.toDecimalPlaces(0),
      costProviderUsd: costUsdForOrder,
      marginXof: price.marginXof.toDecimalPlaces(0),
    };
  }

  /** Admin-only quote: same quantity logic as checkout, with the actual FX cost. */
  async previewAdminPrice(catalogServiceId: string, quantity: number) {
    const [priced, costFxRate] = await Promise.all([
      this.computeOrderPrice(catalogServiceId, quantity, true),
      this.exchangeRate.getCurrentCostRate(),
    ]);
    const costProviderXof = priced.costProviderUsd.mul(costFxRate).toDecimalPlaces(0);
    return {
      quantity,
      priceClientXof: priced.priceClientXof.toString(),
      costProviderXof: costProviderXof.toString(),
      marginXof: priced.priceClientXof.minus(costProviderXof).toDecimalPlaces(0).toString(),
    };
  }

  /** Admin view: exposes provider cost and margin. Never return this shape to a client. */
  async listAdmin() {
    const [services, fxRate, costFxRate] = await Promise.all([
      this.prisma.catalogService.findMany({
        include: { providerService: true, category: true },
        orderBy: { displayOrder: "asc" },
      }),
      this.exchangeRate.getCurrentRate(),
      this.exchangeRate.getCurrentCostRate(),
    ]);

    return services.map((s) => {
      const minQuantity = s.minQuantityOverride ?? s.providerService.minQuantity;
      const maxQuantity = s.maxQuantityOverride ?? s.providerService.maxQuantity;
      const costUsdFor = (quantity: number) => new Decimal(s.providerService.rateUsd.toString()).mul(
        s.providerService.unit === "per_1000" ? new Decimal(quantity).div(1000) : 1,
      );
      const priceFor = (quantity: number) => computePrice({
        pricingRuleType: s.pricingRuleType,
        pricingValue: s.pricingValue.toString(),
        costUsd: costUsdFor(quantity),
        fxRateXofPerUsd: fxRate,
        roundingStep: s.roundingStep?.toString(),
        minPriceXof: commercialMinimumPrice(s.minPriceXof?.toString()),
        maxPriceXof: s.maxPriceXof?.toString(),
      });
      const priceWithoutMinimum = (quantity: number) => computePrice({
        pricingRuleType: s.pricingRuleType,
        pricingValue: s.pricingValue.toString(),
        costUsd: costUsdFor(quantity),
        fxRateXofPerUsd: fxRate,
        roundingStep: s.roundingStep?.toString(),
        minPriceXof: null,
        maxPriceXof: s.maxPriceXof?.toString(),
      });
      const { referenceQuantity, price, minimumQuantity, paymentMinimumReached, paymentMinimumApplied } = findPublicReferenceOffer({
        unit: s.providerService.unit, minQuantity, maxQuantity, priceFor, priceWithoutMinimum,
      });
      const actualProviderCostXof = costUsdFor(referenceQuantity).mul(costFxRate);

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        riskWarning: s.riskWarning,
        category: s.category,
        isVisible: s.isVisible,
        displayOrder: s.displayOrder,
        pricingRuleType: s.pricingRuleType,
        pricingValue: s.pricingValue.toString(),
        roundingStep: s.roundingStep?.toString() ?? null,
        minPriceXof: s.minPriceXof?.toString() ?? null,
        maxPriceXof: s.maxPriceXof?.toString() ?? null,
        provider: {
          providerServiceId: s.providerService.providerServiceId,
          platform: s.providerService.platform,
          rateUsd: s.providerService.rateUsd.toString(),
          unit: s.providerService.unit,
          isActiveUpstream: s.providerService.isActiveUpstream,
          refillSupported: s.providerService.refillSupported,
          minQuantity: s.providerService.minQuantity,
          maxQuantity: s.providerService.maxQuantity,
        },
        minQuantity: minimumQuantity,
        maxQuantity,
        referenceQuantity,
        paymentMinimumReached,
        paymentMinimumApplied,
        fxRateUsed: fxRate.toString(),
        costFxRateUsed: costFxRate.toString(),
        priceClientXof: price.priceClientXof.toDecimalPlaces(0).toString(),
        costProviderXof: actualProviderCostXof.toDecimalPlaces(0).toString(),
        marginXof: price.priceClientXof.minus(actualProviderCostXof).toDecimalPlaces(0).toString(),
      };
    });
  }

  /** Public view: our brand only, no provider id, no cost, no margin. */
  async listPublic() {
    // `select` instead of `include: { providerService: true }` — the latter pulls every
    // column (notably each provider's full markdown `description`, often 1-2KB) across
    // ~1000 rows, which is what made this endpoint take 40-50s once the catalog grew
    // past a couple dozen items. Only the fields actually read below are fetched.
    const [services, fxRate] = await Promise.all([
      this.prisma.catalogService.findMany({
        where: { isVisible: true, providerService: { isActiveUpstream: true } },
        select: {
          id: true,
          name: true,
          description: true,
          riskWarning: true,
          pricingRuleType: true,
          pricingValue: true,
          roundingStep: true,
          minPriceXof: true,
          maxPriceXof: true,
          minQuantityOverride: true,
          maxQuantityOverride: true,
          displayOrder: true,
          category: { select: { slug: true, name: true } },
          providerService: {
            select: {
              rateUsd: true,
              unit: true,
              minQuantity: true,
              maxQuantity: true,
              platform: true,
              refillSupported: true,
              dripfeedSupported: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      }),
      this.exchangeRate.getCurrentRate(),
    ]);

    return services.map((s) => {
      const minQuantity = s.minQuantityOverride ?? s.providerService.minQuantity;
      const priceFor = (quantity: number) => computePrice({
        pricingRuleType: s.pricingRuleType,
        pricingValue: s.pricingValue.toString(),
        costUsd: new Decimal(s.providerService.rateUsd.toString()).mul(
          s.providerService.unit === "per_1000" ? new Decimal(quantity).div(1000) : 1,
        ),
        fxRateXofPerUsd: fxRate,
        roundingStep: s.roundingStep?.toString(),
        minPriceXof: commercialMinimumPrice(s.minPriceXof?.toString()),
        maxPriceXof: s.maxPriceXof?.toString(),
      });
      const priceWithoutMinimum = (quantity: number) => computePrice({
        pricingRuleType: s.pricingRuleType,
        pricingValue: s.pricingValue.toString(),
        costUsd: new Decimal(s.providerService.rateUsd.toString()).mul(
          s.providerService.unit === "per_1000" ? new Decimal(quantity).div(1000) : 1,
        ),
        fxRateXofPerUsd: fxRate,
        roundingStep: s.roundingStep?.toString(),
        minPriceXof: null,
        maxPriceXof: s.maxPriceXof?.toString(),
      });
      const { referenceQuantity, price, minimumQuantity, paymentMinimumReached, paymentMinimumApplied } = findPublicReferenceOffer({
        unit: s.providerService.unit,
        minQuantity,
        maxQuantity: s.maxQuantityOverride ?? s.providerService.maxQuantity,
        priceFor,
        priceWithoutMinimum,
      });

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        riskWarning: s.riskWarning,
        category: { slug: s.category.slug, name: s.category.name },
        platform: s.providerService.platform,
        unit: s.providerService.unit,
        minQuantity: minimumQuantity,
        maxQuantity: s.maxQuantityOverride ?? s.providerService.maxQuantity,
        priceClientXof: price.priceClientXof.toDecimalPlaces(0).toString(),
        referenceQuantity,
        paymentMinimumReached,
        paymentMinimumApplied,
        refillSupported: s.providerService.refillSupported,
        dripfeedSupported: s.providerService.dripfeedSupported,
        // Exact limits aren't worth fetching fieldsSchema (a JSON column) for ~1000 rows
        // just to show a grid card — the checkout page's single-item lookup (getPublicOne)
        // fetches the real values for the one service actually being configured.
        dripfeedMaxRuns: null as number | null,
        dripfeedMaxIntervalMinutes: null as number | null,
      };
    });
  }

  /** Single-item public lookup (checkout page) — same shape as listPublic's entries. */
  async getPublicOne(id: string) {
    const [service, fxRate] = await Promise.all([
      this.prisma.catalogService.findUnique({
        where: { id },
        include: { providerService: true, category: true },
      }),
      this.exchangeRate.getCurrentRate(),
    ]);

    if (!service || !service.isVisible || !service.providerService.isActiveUpstream) {
      throw new NotFoundException("Service indisponible");
    }

    const minQuantity = service.minQuantityOverride ?? service.providerService.minQuantity;
    const priceFor = (quantity: number) => computePrice({
      pricingRuleType: service.pricingRuleType,
      pricingValue: service.pricingValue.toString(),
      costUsd: new Decimal(service.providerService.rateUsd.toString()).mul(
        service.providerService.unit === "per_1000" ? new Decimal(quantity).div(1000) : 1,
      ),
      fxRateXofPerUsd: fxRate,
      roundingStep: service.roundingStep?.toString(),
      minPriceXof: commercialMinimumPrice(service.minPriceXof?.toString()),
      maxPriceXof: service.maxPriceXof?.toString(),
    });
    const priceWithoutMinimum = (quantity: number) => computePrice({
      pricingRuleType: service.pricingRuleType,
      pricingValue: service.pricingValue.toString(),
      costUsd: new Decimal(service.providerService.rateUsd.toString()).mul(
        service.providerService.unit === "per_1000" ? new Decimal(quantity).div(1000) : 1,
      ),
      fxRateXofPerUsd: fxRate,
      roundingStep: service.roundingStep?.toString(),
      minPriceXof: null,
      maxPriceXof: service.maxPriceXof?.toString(),
    });
    const { referenceQuantity, price, minimumQuantity, paymentMinimumReached, paymentMinimumApplied } = findPublicReferenceOffer({
      unit: service.providerService.unit,
      minQuantity,
      maxQuantity: service.maxQuantityOverride ?? service.providerService.maxQuantity,
      priceFor,
      priceWithoutMinimum,
    });

    const dripfeed = extractDripfeedLimits(service.providerService.fieldsSchema);
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      riskWarning: service.riskWarning,
      category: { slug: service.category.slug, name: service.category.name },
      platform: service.providerService.platform,
      unit: service.providerService.unit,
      minQuantity: minimumQuantity,
      maxQuantity: service.maxQuantityOverride ?? service.providerService.maxQuantity,
      priceClientXof: price.priceClientXof.toDecimalPlaces(0).toString(),
      referenceQuantity,
      paymentMinimumReached,
      paymentMinimumApplied,
      refillSupported: service.providerService.refillSupported,
      dripfeedSupported: service.providerService.dripfeedSupported,
      dripfeedMaxRuns: dripfeed.maxRuns,
      dripfeedMaxIntervalMinutes: dripfeed.maxIntervalMinutes,
    };
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
