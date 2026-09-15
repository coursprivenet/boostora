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
import { PanelFollowsClient } from "../panelfollows/panelfollows.client";
import { PanelFollowsApiError } from "../panelfollows/panelfollows.types";
import { CreateOrderDto } from "./dto/create-order.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";

const RETRYABLE_PANELFOLLOWS_HTTP_STATUSES = [429, 502, 503];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly yengapay: YengapayClient,
    private readonly panelFollows: PanelFollowsClient,
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

    await this.ensureSubmittedToProvider(order.id);
    return result;
  }

  /**
   * Called from the Yengapay webhook once its signature is verified. Idempotent:
   * marking PAID and submitting to PanelFollows both no-op if already done — the
   * webhook may well arrive after the synchronous /pay confirmation already handled it.
   */
  async confirmPaymentFromWebhook(reference: string, rawWebhookPayload: object) {
    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      this.logger.warn(`Yengapay webhook for unknown reference=${reference}`);
      return { found: false as const };
    }

    if (payment.status !== PaymentStatus.PAID) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PAID, rawWebhookPayload },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            orderStatus: OrderStatus.PAID,
            paidAt: new Date(),
          },
        }),
      ]);
    } else {
      // Already confirmed synchronously — still record the webhook payload for audit.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { rawWebhookPayload } });
    }

    await this.ensureSubmittedToProvider(payment.orderId);
    return { found: true as const };
  }

  /**
   * Submits a PAID order to PanelFollows. Safe to call more than once: no-ops if
   * providerOrderId is already set. Does not retry on failure — a queue/retry sweep is
   * a separate concern (webhook automation phase); this just records the outcome so a
   * later retry pass has something to act on.
   */
  async ensureSubmittedToProvider(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { catalogService: { include: { providerService: true } } },
    });
    if (!order) return;
    if (order.providerOrderId != null) return;
    if (order.orderStatus === OrderStatus.SUBMITTING) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { orderStatus: OrderStatus.SUBMITTING },
    });

    try {
      const providerOrder = await this.panelFollows.createOrder(
        {
          service: order.catalogService.providerService.providerServiceId,
          link: order.targetLink,
          quantity: order.quantity,
        },
        order.id,
      );

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          providerOrderId: providerOrder.id,
          providerStatusRaw: providerOrder.status,
          orderStatus: OrderStatus.QUEUED,
          submittedAt: new Date(),
        },
      });
      this.logger.log(`Order ${order.id} submitted to PanelFollows as #${providerOrder.id}`);
    } catch (err) {
      const isRetryable =
        err instanceof PanelFollowsApiError &&
        RETRYABLE_PANELFOLLOWS_HTTP_STATUSES.includes(err.httpStatus);

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: isRetryable ? OrderStatus.RETRY_SUBMIT : OrderStatus.SUBMIT_FAILED,
          errorLog:
            err instanceof PanelFollowsApiError
              ? { code: err.code, message: err.message, httpStatus: err.httpStatus }
              : { message: (err as Error).message },
        },
      });
      this.logger.error(`Provider submission failed for order ${order.id}: ${(err as Error).message}`);
    }
  }

  async requestCancel(userId: string, orderId: string) {
    const order = await this.getOwnedOrderWithProviderInfoOrThrow(userId, orderId);

    if (order.providerOrderId == null) {
      throw new BadRequestException("Commande non encore soumise au fournisseur");
    }
    if (!order.catalogService.providerService.cancelSupported) {
      throw new BadRequestException("Annulation non supportée pour ce service");
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.CANCEL_REQUESTED },
      }),
      this.prisma.cancelRequest.create({ data: { orderId: order.id, status: "requested" } }),
    ]);

    try {
      await this.panelFollows.cancelOrder(order.providerOrderId);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.CANCELLED },
      });
      return { status: "cancelled" };
    } catch (err) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.CANCEL_REJECTED },
      });
      if (err instanceof PanelFollowsApiError) {
        throw new BadRequestException(`Annulation refusée: ${err.message}`);
      }
      throw err;
    }
  }

  async requestRefill(userId: string, orderId: string) {
    const order = await this.getOwnedOrderWithProviderInfoOrThrow(userId, orderId);

    if (order.orderStatus !== OrderStatus.COMPLETED) {
      throw new BadRequestException("Le refill n'est possible que pour une commande terminée");
    }
    if (!order.catalogService.providerService.refillSupported) {
      throw new BadRequestException("Refill non supporté pour ce service");
    }
    if (order.providerOrderId == null) {
      throw new BadRequestException("Commande non soumise au fournisseur");
    }

    const refillRow = await this.prisma.refillRequest.create({
      data: { orderId: order.id, status: "requested" },
    });
    await this.prisma.order.update({
      where: { id: order.id },
      data: { orderStatus: OrderStatus.REFILL_REQUESTED },
    });

    try {
      const result = await this.panelFollows.refillOrder(order.providerOrderId);
      await this.prisma.refillRequest.update({
        where: { id: refillRow.id },
        data: { providerRefillId: result.id, status: result.status },
      });
      // Completion is asynchronous on PanelFollows' side (GET /refills/{id} or a
      // refill.updated webhook/event) — left as REFILL_REQUESTED until that lands.
      return { status: "requested", providerRefillId: result.id };
    } catch (err) {
      await this.prisma.$transaction([
        this.prisma.refillRequest.update({
          where: { id: refillRow.id },
          data: { status: "failed" },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { orderStatus: OrderStatus.REFILL_FAILED },
        }),
      ]);
      if (err instanceof PanelFollowsApiError) {
        throw new BadRequestException(`Refill refusé: ${err.message}`);
      }
      throw err;
    }
  }

  private async getOwnedOrderWithProviderInfoOrThrow(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { catalogService: { include: { providerService: true } } },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException("Commande introuvable");
    }
    return order;
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
