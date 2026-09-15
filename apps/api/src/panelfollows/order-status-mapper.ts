import { OrderStatus } from "@prisma/client";

/**
 * PanelFollows does not publish a fixed enum for order.status (see api-docs: "branch on
 * the machine value, don't hardcode it"). Empirically their webhook sample shows the
 * status mirrors the event type suffix (order.completed -> status "completed"), so we
 * map the handful of values we actually recognize and otherwise leave our own
 * orderStatus untouched — providerStatusRaw always stores the exact string regardless.
 */
export function mapProviderOrderStatus(raw: string): OrderStatus | null {
  switch (raw.toLowerCase()) {
    case "pending":
      return OrderStatus.QUEUED;
    case "in_progress":
    case "processing":
      return OrderStatus.PROCESSING;
    case "completed":
      return OrderStatus.COMPLETED;
    case "partial":
      return OrderStatus.PARTIAL;
    case "canceled":
    case "cancelled":
      return OrderStatus.CANCELLED;
    default:
      return null;
  }
}
