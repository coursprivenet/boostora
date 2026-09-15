/** Types mirror the exact payloads documented at the Yengapay Notion (direct-payment flow). */

export type YengapayFlow = "ONE_STEP" | "TWO_STEP";

export interface YengapayArticle {
  title: string;
  description: string;
  price: number;
  pictures?: string[];
}

export interface YengapayOperator {
  code: string; // ORANGE | MOOV | SANKM | CORISM | TELECEL
  name: string;
  countryCode: string;
  countryName: string;
  flagUrl: string;
  flow: YengapayFlow;
  amount: number;
  fees: number;
  totalAmount: number;
  minAmount: number;
  maxAmount: number;
  /** Present for ONE_STEP operators (Orange, Telecel) — the customer dials this to get their own OTP. */
  ussdCode?: string;
  ussdDescription?: string;
}

export interface YengapayInitResponse {
  paymentIntentId: string;
  expiresAt: string;
  availableOperators: YengapayOperator[];
}

export interface YengapaySendOtpResponse {
  status: "OTP_SENT";
  message: string;
  flow?: YengapayFlow;
  paymentIntentId?: string;
  operator?: { code: string; name: string; countryCode: string };
  nextStep?: {
    endpoint: string;
    description: string;
    requiredFields: Record<string, string>;
  };
}

/**
 * Sandbox always returned "DONE" synchronously. A real production project can also
 * return "PENDING" ("Attendez le webhook ou vérifiez le statut.") — undocumented, found
 * empirically. transactionId/amount/fees/totalAmount are only present once status is
 * actually "DONE"; never assume they exist for a PENDING response.
 */
export interface YengapayPayResponse {
  status: "DONE" | "PENDING" | string;
  message?: string;
  transactionId?: string;
  paymentIntentId: string;
  amount?: number;
  fees?: number;
  totalAmount?: number;
  operator?: { code: string; name: string; countryCode: string };
  customerMSISDN?: string;
  flow?: YengapayFlow;
}

/** payment.success webhook body — undocumented event id, dedupe on transId in our WebhookEvent table. */
export interface YengapayPaymentWebhook {
  apiEnv: string;
  paymentStatus: "DONE";
  transId: string;
  projectId: string;
  paymentSourceTransactionID: string;
  paymentIntentId: string;
  paymentSource: string;
  customerNumber: string;
  paymentAmount: number;
  paymentFees: number;
  contryOrigin: string;
  reference: string;
  isPaylink: boolean;
  articles: YengapayArticle[];
  currency: string;
}

export class YengapayApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
    public readonly rawBody?: unknown,
  ) {
    super(message);
    this.name = "YengapayApiError";
  }
}
