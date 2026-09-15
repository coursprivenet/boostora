import { Injectable } from "@nestjs/common";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const FAILED_STATUSES: OrderStatus[] = [
  OrderStatus.SUBMIT_FAILED,
  OrderStatus.CANCEL_REJECTED,
  OrderStatus.REFILL_FAILED,
];

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [totalUsers, totalOrders, ordersByStatusRaw, failedOrders, paidOrders] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.groupBy({ by: ["orderStatus"], _count: { _all: true } }),
      this.prisma.order.count({ where: { orderStatus: { in: FAILED_STATUSES } } }),
      this.prisma.order.findMany({
        where: { paymentStatus: PaymentStatus.PAID },
        include: { payment: { select: { feesXof: true } }, catalogService: { select: { name: true } } },
      }),
    ]);

    const ordersByStatus = Object.fromEntries(
      ordersByStatusRaw.map((row) => [row.orderStatus, row._count._all]),
    );

    let totalRevenueXof = 0;
    let grossMarginXof = 0;
    let netMarginXof = 0;
    const revenueByService = new Map<string, { name: string; count: number; revenueXof: number }>();

    for (const order of paidOrders) {
      const price = Number(order.priceClientXof);
      const margin = Number(order.marginXof);
      const fees = order.payment?.feesXof ? Number(order.payment.feesXof) : 0;

      totalRevenueXof += price;
      grossMarginXof += margin;
      netMarginXof += margin - fees;

      const key = order.catalogServiceId;
      const entry = revenueByService.get(key) ?? {
        name: order.catalogService.name,
        count: 0,
        revenueXof: 0,
      };
      entry.count += 1;
      entry.revenueXof += price;
      revenueByService.set(key, entry);
    }

    const topServices = Array.from(revenueByService.values())
      .sort((a, b) => b.revenueXof - a.revenueXof)
      .slice(0, 5);

    return {
      totalUsers,
      totalOrders,
      paidOrdersCount: paidOrders.length,
      failedOrders,
      ordersByStatus,
      totalRevenueXof,
      grossMarginXof,
      netMarginXof,
      topServices,
    };
  }
}
