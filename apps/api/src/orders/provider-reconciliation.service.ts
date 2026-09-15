import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PanelFollowsClient } from "../panelfollows/panelfollows.client";
import { OrdersService } from "./orders.service";

/**
 * Polling safety net alongside the PanelFollows webhook: catches a lost/never-received
 * delivery, and retries an order stuck in RETRY_SUBMIT after a transient provider error.
 * Runs on a fixed interval rather than a queue — the order volume here doesn't yet
 * justify standing up Redis/BullMQ for this.
 */
@Injectable()
export class ProviderReconciliationService {
  private readonly logger = new Logger(ProviderReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly panelFollows: PanelFollowsClient,
    private readonly orders: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcileActiveOrders() {
    const active = await this.prisma.order.findMany({
      where: {
        orderStatus: { in: [OrderStatus.QUEUED, OrderStatus.PROCESSING] },
        providerOrderId: { not: null },
      },
      take: 100,
    });

    for (const order of active) {
      try {
        const remote = await this.panelFollows.getOrder(order.providerOrderId!);
        await this.orders.applyProviderOrderUpdate(order.providerOrderId!, remote);
      } catch (err) {
        this.logger.warn(`Reconcile poll failed for order ${order.id}: ${(err as Error).message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryStuckSubmissions() {
    const stuck = await this.prisma.order.findMany({
      where: { orderStatus: OrderStatus.RETRY_SUBMIT },
      take: 50,
    });

    for (const order of stuck) {
      await this.orders.ensureSubmittedToProvider(order.id);
    }
  }

  /**
   * Abandoned checkouts (client never came back to send-otp/confirm) otherwise sit as
   * PENDING_PAYMENT forever — Yengapay doesn't push us anything for those, and the
   * lazy expiry check only fires if the client happens to retry. Sweep them here too.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireAbandonedPayments() {
    const expired = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING, expiresAt: { lt: new Date() } },
      take: 200,
    });

    for (const payment of expired) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.EXPIRED },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: { orderStatus: OrderStatus.EXPIRED },
        }),
      ]);
    }
    if (expired.length > 0) {
      this.logger.log(`Expired ${expired.length} abandoned payment(s)`);
    }
  }
}
