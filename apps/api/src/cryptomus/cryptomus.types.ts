export interface CryptomusInvoiceResponse {
  uuid: string;
  url: string;
  status: string;
  order_id: string;
  expired_at?: string;
}

export interface CryptomusPaymentWebhook {
  uuid: string;
  order_id: string;
  status: "paid" | "paid_over" | "wrong_amount" | "cancel" | "fail" | string;
  is_final: boolean;
  merchant_amount?: string;
  commission?: string;
  txid?: string | null;
  network?: string;
  payer_currency?: string;
  sign: string;
  [key: string]: unknown;
}

export class CryptomusApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "CryptomusApiError";
  }
}
