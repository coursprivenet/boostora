export type UserRole = "CLIENT" | "SUPPORT" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: { slug: string; name: string };
  platform: string;
  unit: string;
  minQuantity: number;
  maxQuantity: number;
  priceClientXof: string;
}

export interface YengapayOperator {
  code: string;
  name: string;
  countryCode: string;
  countryName: string;
  flagUrl: string;
  flow: "ONE_STEP" | "TWO_STEP";
  amount: number;
  fees: number;
  totalAmount: number;
  minAmount: number;
  maxAmount: number;
  ussdCode?: string;
  ussdDescription?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  expiresAt: string;
  priceClientXof: string;
  availableOperators: YengapayOperator[];
}

export interface OrderSummary {
  id: string;
  targetLink: string;
  quantity: number;
  priceClientXof: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  startCount: number | null;
  remains: number | null;
  catalogService: { name: string; description: string | null };
  payment: { status: string; expiresAt: string | null } | null;
}
