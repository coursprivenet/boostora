import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CouponDiscountType } from "@prisma/client";
import Decimal from "decimal.js";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { UpsertCouponDto } from "./dto/upsert-coupon.dto";
import { PreviewCouponDto } from "./dto/preview-coupon.dto";

export interface CouponDiscountResult {
  couponId: string;
  discountXof: Decimal;
  finalPriceXof: Decimal;
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }

  /** Public-safe: just enough for checkout to decide whether to show the coupon field at
   * all — no reason to render a dead-end "code promo" box while zero codes exist. */
  async anyRedeemableExist() {
    const count = await this.prisma.coupon.count({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return { exists: count > 0 };
  }

  async create(dto: UpsertCouponDto, actorUserId: string) {
    const created = await this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        value: dto.value,
        maxUses: dto.maxUses,
        minOrderXof: dto.minOrderXof,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive ?? true,
      },
    });
    await this.auditLog.record(actorUserId, "coupon.create", created.id, { code: created.code });
    return created;
  }

  async update(id: string, dto: Partial<UpsertCouponDto>, actorUserId: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Coupon introuvable");

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
        ...(dto.discountType ? { discountType: dto.discountType } : {}),
        ...(dto.value != null ? { value: dto.value } : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.minOrderXof !== undefined ? { minOrderXof: dto.minOrderXof } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.auditLog.record(actorUserId, "coupon.update", id, dto as Record<string, unknown>);
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Coupon introuvable");
    await this.prisma.coupon.delete({ where: { id } });
    await this.auditLog.record(actorUserId, "coupon.delete", id, { code: existing.code });
    return { deleted: true };
  }

  /** Checkout-page live preview: same validation as order creation, nothing persisted. */
  async preview(userId: string | undefined, dto: PreviewCouponDto) {
    const priced = await this.catalog.computeOrderPrice(dto.catalogServiceId, dto.quantity);
    const result = await this.validateAndComputeDiscount(
      dto.code,
      userId,
      priced.priceClientXof,
    );
    return {
      discountXof: result.discountXof.toDecimalPlaces(0).toString(),
      finalPriceXof: result.finalPriceXof.toDecimalPlaces(0).toString(),
    };
  }

  /**
   * Throws with a client-facing message if the code can't be applied. Checked again,
   * effectively, at redemption time via the (couponId, userId) unique constraint --
   * this call only gives fast feedback and locks in the discounted price to charge.
   */
  async validateAndComputeDiscount(
    rawCode: string,
    userId: string | undefined,
    priceBeforeDiscount: Decimal,
  ): Promise<CouponDiscountResult> {
    const code = rawCode.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException("Code promo invalide");
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Ce code promo a expiré");
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException("Ce code promo a atteint sa limite d'utilisation");
    }
    if (coupon.minOrderXof && priceBeforeDiscount.lt(coupon.minOrderXof.toString())) {
      throw new BadRequestException(
        `Ce code promo nécessite un montant minimum de ${coupon.minOrderXof} XOF`,
      );
    }

    if (userId) {
      const alreadyRedeemed = await this.prisma.couponRedemption.findUnique({
        where: { couponId_userId: { couponId: coupon.id, userId } },
      });
      if (alreadyRedeemed) {
        throw new BadRequestException("Tu as déjà utilisé ce code promo");
      }
    }

    let discountXof: Decimal;
    if (coupon.discountType === CouponDiscountType.PERCENT) {
      discountXof = priceBeforeDiscount.mul(new Decimal(coupon.value.toString()).div(100));
    } else {
      discountXof = new Decimal(coupon.value.toString());
    }
    // Never let a discount take the price below 0, and never below the 100 XOF
    // Yengapay minimum (see Yengapay Notion: "Le montant minimum pour un paiement est
    // fixé a 100 F") -- silently clamp rather than let checkout fail downstream.
    const finalPriceXof = Decimal.max(
      100,
      priceBeforeDiscount.minus(discountXof),
    ).toDecimalPlaces(0);
    discountXof = priceBeforeDiscount.minus(finalPriceXof);

    return { couponId: coupon.id, discountXof, finalPriceXof };
  }

  /**
   * Called only once a payment is confirmed (never at order creation) so an abandoned
   * checkout never consumes a coupon use. Fire-and-forget by design, like AuditLogService
   * -- a bookkeeping failure here must never roll back a real, already-confirmed payment.
   */
  async recordRedemption(couponId: string, userId: string, orderId: string, discountXof: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.couponRedemption.create({
          data: { couponId, userId, orderId, discountXof },
        }),
        this.prisma.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      // Most likely the (couponId, userId) unique constraint -- a rare race where two
      // orders from the same user both passed the pre-check before either paid. The
      // customer keeps the price they already paid either way; we just don't double-count.
      this.logger.warn(`Could not record coupon redemption for order ${orderId}: ${(err as Error).message}`);
    }
  }
}
