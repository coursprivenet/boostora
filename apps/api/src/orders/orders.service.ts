import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { YengapayClient } from "../yengapay/yengapay.client";
import { YengapayApiError } from "../yengapay/yengapay.types";
import { CreateOrderDto } from "./dto/create-order.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly yengapay: YengapayClient,
  ) {}

  async listMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { catalogService: true, payment: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Admin view: exposes both margins. marginXof is the gross margin computed at pricing
   * time (before the order is even paid); netMarginXof only exists once Yengapay's
   * actual fee (feesXof, known only after a successful /pay call) can be deducted from
   * it — Yengapay's fee is not knowable in advance, so gross is an estimate, net is the
   * real number to judge profitability on.
   */
  async listAdmin() {
    const orders = await this.prisma.order.findMany({
      include: { catalogService: true, payment: true, user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => {
      const feesXof = o.payment?.feesXof ? Number(o.payment.feesXof) : null;
      const netMarginXof =
        o.payment?.status === PaymentStatus.PAID && feesXof != null
          ? Number(o.marginXof) - feesXof
          : null;

      return {
        ...o,
        yengapayFeesXof: feesXof,
        netMarginXof,
      };
    });
  }

  async getOneMine(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { catalogService: true, payment: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException("Commande introuvable");
    }
    return order;
  }

  /**
   * Creates the order shell + prices it, then opens a Yengapay payment intent.
   * The order only reaches PAID once the client completes send-otp + confirm below —
   * never on the strength of this call alone.
   */
  async create(userId: string, dto: CreateOrderDto) {
    const priced = await this.catalog.computeOrderPrice(dto.catalogServiceId, dto.quantity);

    const order = await this.prisma.order.create({
      data: {
        userId,
        catalogServiceId: dto.catalogServiceId,
        targetLink: dto.targetLink,
        quantity: dto.quantity,
        priceClientXof: priced.priceClientXof.toString(),
        costProviderUsd: priced.costProviderUsd.toString(),
        fxRateUsed: priced.fxRateUsed.toString(),
        marginXof: priced.marginXof.toString(),
      },
    });

    try {
      const init = await this.yengapay.initDirectPayment({
        amount: priced.priceClientXof.toNumber(),
        reference: order.id,
        articles: [
          {
            title: priced.catalogService.name,
            description: priced.catalogService.description ?? priced.catalogService.name,
            price: priced.priceClientXof.toNumber(),
          },
        ],
      });

      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          reference: order.id,
          yengapayPaymentIntentId: init.paymentIntentId,
          amountXof: priced.priceClientXof.toString(),
          expiresAt: new Date(init.expiresAt),
          rawInitResponse: init as unknown as object,
        },
      });

      return {
        orderId: order.id,
        expiresAt: init.expiresAt,
        priceClientXof: priced.priceClientXof.toString(),
        availableOperators: init.availableOperators,
      };
    } catch (err) {
      // No payment intent exists yet on Yengapay's side for this order — safe to roll back.
      await this.prisma.order.delete({ where: { id: order.id } });
      if (err instanceof YengapayApiError) {
        throw new BadRequestException(
          `Impossible d'initier le paiement: ${err.message}`,
        );
      }
      throw err;
    }
  }

  async sendOtp(userId: string, orderId: string, dto: SendOtpDto) {
    const { payment } = await this.getPayableOrderOrThrow(userId, orderId);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { operatorCode: dto.operatorCode },
    });

    try {
      return await this.yengapay.sendOtp({
        paymentIntentId: payment.yengapayPaymentIntentId!,
        operatorCode: dto.operatorCode,
        countryCode: dto.countryCode,
        customerMSISDN: dto.customerMSISDN,
      });
    } catch (err) {
      if (err instanceof YengapayApiError) {
        throw new BadRequestException(`Envoi du code impossible: ${err.message}`);
      }
      throw err;
    }
  }

  async confirmPayment(userId: string, orderId: string, dto: ConfirmPaymentDto) {
    const { order, payment } = await this.getPayableOrderOrThrow(userId, orderId);

    let result;
    try {
      result = await this.yengapay.pay({
        paymentIntentId: payment.yengapayPaymentIntentId!,
        operatorCode: dto.operatorCode,
        countryCode: dto.countryCode,
        customerMSISDN: dto.customerMSISDN,
        otp: dto.otp,
      });
    } catch (err) {
      if (err instanceof YengapayApiError) {
        // A rejected OTP/insufficient funds is not fatal — the client can retry
        // (re-enter the OTP, or resend it) while the payment intent is still valid.
        throw new BadRequestException(`Paiement refusé: ${err.message}`);
      }
      throw err;
    }

    // This is a direct, synchronous server-to-server confirmation from Yengapay's own
    // API over our own authenticated call — not a client-supplied "success" redirect —
    // so it's a valid source of truth. The webhook (when it also arrives) is still
    // processed and deduped; it just confirms what we already know.
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          operatorCode: dto.operatorCode,
          feesXof: result.fees,
          rawConfirmResponse: result as unknown as object,
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PAID,
          paidAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`Order ${order.id} paid via Yengapay (transactionId=${result.transactionId})`);
    return result;
  }

  private async getPayableOrderOrThrow(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException("Commande introuvable");
    }
    if (!order.payment) {
      throw new BadRequestException("Aucun paiement initié pour cette commande");
    }
    if (order.payment.status === PaymentStatus.PAID) {
      throw new ForbiddenException("Cette commande est déjà payée");
    }
    if (order.payment.expiresAt && order.payment.expiresAt.getTime() < Date.now()) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.EXPIRED },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { orderStatus: OrderStatus.EXPIRED },
        }),
      ]);
      throw new BadRequestException("Le délai de paiement a expiré, recréez la commande");
    }

    return { order, payment: order.payment };
  }
}
