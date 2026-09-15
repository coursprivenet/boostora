import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OrderStatus } from "@prisma/client";
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
}
