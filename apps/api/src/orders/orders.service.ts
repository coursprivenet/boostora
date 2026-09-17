import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { YengapayClient } from "../yengapay/yengapay.client";
import { YengapayApiError, YengapayPaymentWebhook } from "../yengapay/yengapay.types";
import { PanelFollowsClient } from "../panelfollows/panelfollows.client";
import { PanelFollowsApiError } from "../panelfollows/panelfollows.types";
import { mapProviderOrderStatus } from "../panelfollows/order-status-mapper";
import { extractDripfeedLimits } from "../panelfollows/dripfeed.util";
import { AuditLogService } from "../audit-log/audit-log.service";
import { CouponsService } from "../coupons/coupons.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import { RefundOrderDto } from "./dto/refund-order.dto";

const RETRYABLE_PANELFOLLOWS_HTTP_STATUSES = [429, 502, 503];

/** Mirrors the frontend's recommendedDripfeedDays heuristic (checkout page) — kept in
 * sync manually since this is the authoritative, server-enforced minimum, not just a
 * UI suggestion. A big order delivered all at once is the most visible kind of spike. */
function minDripfeedDaysFor(quantity: number): number {
  if (quantity <= 10000) return 0;
  if (quantity <= 20000) return 5;
  if (quantity <= 50000) return 7;
  if (quantity <= 100000) return 10;
  return 14;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly yengapay: YengapayClient,
    private readonly panelFollows: PanelFollowsClient,
    private readonly auditLog: AuditLogService,
    private readonly coupons: CouponsService,
    private readonly notifications: NotificationsService,
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

  /** For accounting/reconciliation outside the app — same data as listAdmin(), flattened. */
  async exportOrdersCsv(): Promise<string> {
    const orders = await this.listAdmin();

    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const header = [
      "Date",
      "Client",
      "Service",
      "Lien cible",
      "Quantité",
      "Prix XOF",
      "Coût USD",
      "Marge brute XOF",
      "Marge nette XOF",
      "Statut commande",
      "Statut paiement",
      "Référence paiement",
      "ID transaction Yengapay",
      "ID transaction opérateur",
      "Payé le",
      "Remboursé le",
      "Montant remboursé XOF",
      "Motif remboursement",
    ];

    const rows = orders.map((o) => [
      o.createdAt.toISOString(),
      o.user.email,
      o.catalogService.name,
      o.targetLink,
      o.quantity,
      o.priceClientXof.toString(),
      o.costProviderUsd.toString(),
      o.marginXof.toString(),
      o.netMarginXof ?? "",
      o.orderStatus,
      o.paymentStatus,
      o.payment?.reference ?? "",
      o.payment?.transactionId ?? "",
      o.payment?.operatorTransactionId ?? "",
      o.paidAt?.toISOString() ?? "",
      o.payment?.refundedAt?.toISOString() ?? "",
      o.payment?.refundAmountXof?.toString() ?? "",
      o.payment?.refundReason ?? "",
    ]);

    const lines = [header, ...rows].map((row) => row.map(escape).join(","));
    return lines.join("\r\n");
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
    const duplicate = await this.findReusableDuplicate(userId, dto);
    if (duplicate) return duplicate;

    const priced = await this.catalog.computeOrderPrice(dto.catalogServiceId, dto.quantity);

    const dripfeedRequested = dto.dripfeedRuns != null || dto.dripfeedIntervalMinutes != null;
    if (dripfeedRequested) {
      if (dto.dripfeedRuns == null || dto.dripfeedIntervalMinutes == null) {
        throw new BadRequestException("dripfeedRuns et dripfeedIntervalMinutes doivent être fournis ensemble");
      }
      if (!priced.providerService.dripfeedSupported) {
        throw new BadRequestException("Ce service ne supporte pas la livraison échelonnée");
      }
      const limits = extractDripfeedLimits(priced.providerService.fieldsSchema);
      if (limits.maxRuns != null && dto.dripfeedRuns > limits.maxRuns) {
        throw new BadRequestException(`Nombre de lots trop élevé (max ${limits.maxRuns})`);
      }
      if (limits.maxIntervalMinutes != null && dto.dripfeedIntervalMinutes > limits.maxIntervalMinutes) {
        throw new BadRequestException(`Intervalle trop élevé (max ${limits.maxIntervalMinutes} min)`);
      }
    }

    const minDays = minDripfeedDaysFor(dto.quantity);
    if (minDays > 0) {
      if (!priced.providerService.dripfeedSupported) {
        throw new BadRequestException(
          `Les commandes de plus de 10 000 unités doivent être étalées dans le temps — ce service ne supporte pas la livraison échelonnée, réduis la quantité ou choisis un autre service.`,
        );
      }
      const totalSpreadDays = dripfeedRequested
        ? (dto.dripfeedRuns! * dto.dripfeedIntervalMinutes!) / (24 * 60)
        : 0;
      if (totalSpreadDays < minDays) {
        throw new BadRequestException(
          `Les commandes de plus de 10 000 unités doivent être étalées sur au moins ${minDays} jours — active la livraison échelonnée avec un délai suffisant.`,
        );
      }
    }

    let couponId: string | null = null;
    let finalPriceXof = priced.priceClientXof;
    let discountXof = new Decimal(0);
    if (dto.couponCode) {
      const discount = await this.coupons.validateAndComputeDiscount(
        dto.couponCode,
        userId,
        priced.priceClientXof,
      );
      couponId = discount.couponId;
      finalPriceXof = discount.finalPriceXof;
      discountXof = discount.discountXof;
    }
    // Margin absorbs the discount — it's real money we're giving up, not the provider's.
    const marginAfterDiscount = priced.marginXof.minus(discountXof);

    const order = await this.prisma.order.create({
      data: {
        userId,
        catalogServiceId: dto.catalogServiceId,
        targetLink: dto.targetLink,
        quantity: dto.quantity,
        priceClientXof: finalPriceXof.toString(),
        costProviderUsd: priced.costProviderUsd.toString(),
        fxRateUsed: priced.fxRateUsed.toString(),
        marginXof: marginAfterDiscount.toString(),
        couponId,
        discountXof: discountXof.toString(),
        termsAcceptedAt: new Date(),
        dripfeedRuns: dto.dripfeedRuns,
        dripfeedIntervalMinutes: dto.dripfeedIntervalMinutes,
      },
    });

    try {
      const init = await this.yengapay.initDirectPayment({
        amount: finalPriceXof.toNumber(),
        reference: order.id,
        articles: [
          {
            title: priced.catalogService.name,
            description: priced.catalogService.description ?? priced.catalogService.name,
            price: finalPriceXof.toNumber(),
          },
        ],
      });

      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          reference: order.id,
          yengapayPaymentIntentId: init.paymentIntentId,
          amountXof: finalPriceXof.toString(),
          expiresAt: new Date(init.expiresAt),
          rawInitResponse: init as unknown as object,
        },
      });

      return {
        orderId: order.id,
        expiresAt: init.expiresAt,
        priceClientXof: finalPriceXof.toString(),
        discountXof: discountXof.toString(),
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

  /**
   * Guards against a double form submit / retried request creating two payment
   * intents for the same intent: an unpaid, unexpired order for this exact
   * user+service+link+quantity, opened in the last two minutes, is reused as-is
   * instead of creating a new one.
   */
  private async findReusableDuplicate(userId: string, dto: CreateOrderDto) {
    const cutoff = new Date(Date.now() - 2 * 60_000);
    const existing = await this.prisma.order.findFirst({
      where: {
        userId,
        catalogServiceId: dto.catalogServiceId,
        targetLink: dto.targetLink,
        quantity: dto.quantity,
        orderStatus: OrderStatus.PENDING_PAYMENT,
        createdAt: { gte: cutoff },
      },
      include: { payment: true },
      orderBy: { createdAt: "desc" },
    });

    if (!existing?.payment || existing.payment.status !== PaymentStatus.PENDING) return null;
    if (existing.payment.expiresAt && existing.payment.expiresAt.getTime() < Date.now()) return null;

    const init = existing.payment.rawInitResponse as {
      availableOperators: unknown;
    } | null;
    if (!init) return null;

    return {
      orderId: existing.id,
      expiresAt: existing.payment.expiresAt?.toISOString(),
      priceClientXof: existing.priceClientXof.toString(),
      availableOperators: init.availableOperators,
    };
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

    // Always record what Yengapay actually said, regardless of status.
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { operatorCode: dto.operatorCode, rawConfirmResponse: result as unknown as object },
    });

    if (result.status !== "DONE") {
      // Sandbox always answered DONE synchronously; a real production project can
      // answer PENDING instead ("Attendez le webhook ou vérifiez le statut" — found
      // empirically, undocumented). Do NOT mark PAID on the strength of this response
      // alone — that would be exactly the "trusted a redirect/response that looked like
      // success" mistake, just one hop removed. The webhook (confirmPaymentFromWebhook)
      // is the only thing allowed to confirm PAID from here.
      this.logger.log(`Order ${order.id} payment is ${result.status}, awaiting webhook confirmation`);
      return result;
    }

    // A synchronous DONE is a direct, server-to-server confirmation from Yengapay's own
    // API over our own authenticated call — not a client-supplied "success" redirect —
    // so it's a valid source of truth. The webhook (when it also arrives) is still
    // processed and deduped; it just confirms what we already know.
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, feesXof: result.fees, transactionId: result.transactionId },
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
    await this.notifications.notify(
      userId,
      "order.paid",
      "Paiement confirmé",
      "Ta commande a été payée et va être transmise au fournisseur.",
      `/dashboard/orders/${order.id}`,
    );

    if (order.couponId) {
      await this.coupons.recordRedemption(order.couponId, userId, order.id, order.discountXof.toString());
    }
    await this.ensureSubmittedToProvider(order.id);
    return result;
  }

  /**
   * Called from the Yengapay webhook once its signature is verified. Idempotent:
   * marking PAID and submitting to PanelFollows both no-op if already done — the
   * webhook may well arrive after the synchronous /pay confirmation already handled it.
   */
  async confirmPaymentFromWebhook(reference: string, webhookBody: YengapayPaymentWebhook) {
    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      this.logger.warn(`Yengapay webhook for unknown reference=${reference}`);
      return { found: false as const };
    }

    if (payment.status !== PaymentStatus.PAID) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            rawWebhookPayload: webhookBody as unknown as object,
            // The sync /pay confirmation may have already set transactionId — never overwrite
            // it with a different value, but operatorTransactionId is only ever known here.
            transactionId: payment.transactionId ?? webhookBody.transId,
            operatorTransactionId: webhookBody.paymentSourceTransactionID,
            // Same gap as transactionId: a payment that settles asynchronously (any ONE_STEP/
            // USSD flow, or a TWO_STEP payment Yengapay confirms after the request returns)
            // never goes through the sync /pay branch that used to be the only place feesXof
            // was written — netMarginXof stayed permanently null ("—" in the admin table) for
            // every one of those, not just a display glitch on one order.
            feesXof: payment.feesXof ?? webhookBody.paymentFees,
          },
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

      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { couponId: true, discountXof: true, userId: true },
      });
      if (order) {
        await this.notifications.notify(
          order.userId,
          "order.paid",
          "Paiement confirmé",
          "Ta commande a été payée et va être transmise au fournisseur.",
          `/dashboard/orders/${payment.orderId}`,
        );
      }
      if (order?.couponId) {
        await this.coupons.recordRedemption(
          order.couponId,
          order.userId,
          payment.orderId,
          order.discountXof.toString(),
        );
      }
    } else {
      // Already confirmed synchronously — still record the webhook payload and the
      // operator's own transaction id, which only ever arrives via this webhook.
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          rawWebhookPayload: webhookBody as unknown as object,
          operatorTransactionId: webhookBody.paymentSourceTransactionID,
        },
      });
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
  async ensureSubmittedToProvider(orderId: string, triggeredManuallyBy?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { catalogService: { include: { providerService: true } } },
    });
    if (!order) return;
    if (order.providerOrderId != null) return;
    if (order.orderStatus === OrderStatus.SUBMITTING) return;

    if (triggeredManuallyBy) {
      await this.auditLog.record(triggeredManuallyBy, "order.manual_resubmit", order.id, {
        previousStatus: order.orderStatus,
      });
    }

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
          ...(order.dripfeedRuns != null && order.dripfeedIntervalMinutes != null
            ? { runs: order.dripfeedRuns, interval: order.dripfeedIntervalMinutes }
            : {}),
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

      if (!isRetryable) {
        await this.notifications.notify(
          order.userId,
          "order.submit_failed",
          "Un problème est survenu avec ta commande",
          "Notre équipe a été alertée et va régulariser ça rapidement.",
          `/dashboard/orders/${order.id}`,
        );
        // The client sees a reassuring "on s'en occupe" — admins need the real reason
        // (most often: PanelFollows balance ran dry) so someone actually acts on it.
        const reason = err instanceof PanelFollowsApiError ? err.message : (err as Error).message;
        await this.notifications.notifyAdmins(
          "admin.order_submit_failed",
          "Commande bloquée — action requise",
          `${order.catalogService.name} (${order.quantity} unités, ${order.priceClientXof} FCFA déjà payés) n'a pas pu être transmise à PanelFollows : ${reason}. Recharge le solde puis réessaie depuis l'admin.`,
          `/admin/orders`,
        );
      }
    }
  }

  /**
   * Applies a provider-side order status update, from either the PanelFollows webhook
   * or the polling reconciliation sweep — same shape, same logic, so the two sources
   * can never drift into inconsistent mapping rules.
   */
  async applyProviderOrderUpdate(
    providerOrderId: number,
    raw: { status: string; start_count?: number | null; remains?: number | null },
  ) {
    const order = await this.prisma.order.findFirst({ where: { providerOrderId } });
    if (!order) {
      this.logger.warn(`No local order for PanelFollows providerOrderId=${providerOrderId}`);
      return;
    }

    const mapped = mapProviderOrderStatus(raw.status);
    const data: Record<string, unknown> = { providerStatusRaw: raw.status };
    if (raw.start_count != null) data.startCount = raw.start_count;
    if (raw.remains != null) data.remains = raw.remains;
    if (mapped) {
      data.orderStatus = mapped;
      if (mapped === OrderStatus.COMPLETED) data.completedAt = new Date();
    }

    await this.prisma.order.update({ where: { id: order.id }, data });

    const NOTIFY_MESSAGES: Partial<Record<OrderStatus, [string, string]>> = {
      [OrderStatus.COMPLETED]: ["Commande terminée", "Ta commande a été livrée avec succès."],
      [OrderStatus.PARTIAL]: [
        "Commande partiellement livrée",
        "Une partie a été livrée, le reste a été remboursé par le fournisseur.",
      ],
      [OrderStatus.CANCELLED]: ["Commande annulée", "Ta commande a été annulée par le fournisseur."],
    };
    if (mapped && NOTIFY_MESSAGES[mapped]) {
      const [title, body] = NOTIFY_MESSAGES[mapped]!;
      await this.notifications.notify(order.userId, `order.${mapped.toLowerCase()}`, title, body, `/dashboard/orders/${order.id}`);
    }
  }

  async applyRefillUpdate(providerRefillId: number, status: string) {
    const refill = await this.prisma.refillRequest.findFirst({ where: { providerRefillId } });
    if (!refill) {
      this.logger.warn(`No local refill request for providerRefillId=${providerRefillId}`);
      return;
    }

    await this.prisma.refillRequest.update({ where: { id: refill.id }, data: { status } });

    const normalized = status.toLowerCase();
    if (normalized === "completed" || normalized === "done") {
      const order = await this.prisma.order.update({
        where: { id: refill.orderId },
        data: { orderStatus: OrderStatus.REFILL_DONE },
      });
      await this.notifications.notify(
        order.userId,
        "order.refill_done",
        "Refill effectué",
        "Le fournisseur a complété ton refill.",
        `/dashboard/orders/${order.id}`,
      );
    } else if (normalized === "rejected" || normalized === "failed") {
      const order = await this.prisma.order.update({
        where: { id: refill.orderId },
        data: { orderStatus: OrderStatus.REFILL_FAILED },
      });
      await this.notifications.notify(
        order.userId,
        "order.refill_failed",
        "Refill refusé",
        "Le fournisseur a refusé la demande de refill.",
        `/dashboard/orders/${order.id}`,
      );
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
      await this.auditLog.record(userId, "order.cancel", order.id);
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
      await this.auditLog.record(userId, "order.refill_request", order.id);
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

  /**
   * Refunds are never automated via Yengapay (no payout API is integrated) — this records
   * a mobile money transfer the admin has already sent manually outside this app, per the
   * process refund-policy.tsx describes to clients.
   */
  async adminRefund(orderId: string, dto: RefundOrderDto, actorUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order || !order.payment) {
      throw new NotFoundException("Commande ou paiement introuvable");
    }
    if (order.payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException("Seule une commande payée peut être remboursée");
    }

    const amountXof = dto.amountXof ?? Number(order.payment.amountXof);
    if (amountXof > Number(order.payment.amountXof)) {
      throw new BadRequestException("Le montant du remboursement dépasse le montant payé");
    }

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmountXof: amountXof,
        refundReason: dto.reason,
        refundedByUserId: actorUserId,
      },
    });

    await this.auditLog.record(actorUserId, "order.refund", order.id, { amountXof, reason: dto.reason });
    await this.notifications.notify(
      order.userId,
      "order.refunded",
      "Remboursement effectué",
      `Un remboursement de ${amountXof} FCFA a été envoyé sur ton compte mobile money.`,
      `/dashboard/orders/${order.id}`,
    );

    return { status: "refunded", amountXof };
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
