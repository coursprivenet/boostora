/**
 * Internal order status. PanelFollows does not publish a fixed enum for
 * order.status — we store their raw value separately (see OrderStatusRaw)
 * and map it into this internal state machine ourselves.
 */
export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  SUBMITTING = "SUBMITTING",
  RETRY_SUBMIT = "RETRY_SUBMIT",
  SUBMIT_FAILED = "SUBMIT_FAILED",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  PARTIAL = "PARTIAL",
  CANCEL_REQUESTED = "CANCEL_REQUESTED",
  CANCELLED = "CANCELLED",
  CANCEL_REJECTED = "CANCEL_REJECTED",
  REFILL_REQUESTED = "REFILL_REQUESTED",
  REFILL_DONE = "REFILL_DONE",
  REFILL_FAILED = "REFILL_FAILED",
  EXPIRED = "EXPIRED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  EXPIRED = "EXPIRED",
  FAILED = "FAILED",
}

/** PanelFollows webhook/event types, as documented at panelfollows.com/en/api-docs. */
export enum ProviderEventType {
  ORDER_CREATED = "order.created",
  ORDER_PROCESSING = "order.processing",
  ORDER_COMPLETED = "order.completed",
  ORDER_PARTIAL = "order.partial",
  ORDER_CANCELED = "order.canceled",
  ORDER_UPDATED = "order.updated",
  REFILL_CREATED = "refill.created",
  REFILL_UPDATED = "refill.updated",
  ACCOUNT_LOW_BALANCE = "account.low_balance",
}

/** Yengapay direct-payment operator flow, as documented. */
export enum YengapayFlow {
  ONE_STEP = "ONE_STEP",
  TWO_STEP = "TWO_STEP",
}

export enum YengapayOperatorCode {
  ORANGE = "ORANGE",
  MOOV = "MOOV",
  SANKM = "SANKM",
  CORISM = "CORISM",
  TELECEL = "TELECEL",
}
