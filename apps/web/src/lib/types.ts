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
  discountXof: string;
  availableOperators: YengapayOperator[];
}

export type CouponDiscountType = "PERCENT" | "FIXED_XOF";

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  value: string;
  maxUses: number | null;
  usedCount: number;
  minOrderXof: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CouponPreview {
  discountXof: string;
  finalPriceXof: string;
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

export interface AdminOrder extends OrderSummary {
  costProviderUsd: string;
  marginXof: string;
  providerOrderId: number | null;
  providerStatusRaw: string | null;
  user: { email: string };
  yengapayFeesXof: number | null;
  netMarginXof: number | null;
}

export interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  paidOrdersCount: number;
  failedOrders: number;
  ordersByStatus: Record<string, number>;
  totalRevenueXof: number;
  grossMarginXof: number;
  netMarginXof: number;
  topServices: { name: string; count: number; revenueXof: number }[];
}

export interface ProviderServiceRow {
  id: string;
  providerServiceId: number;
  name: string;
  platform: string;
  categorySlug: string;
  categoryName: string;
  rateUsd: string;
  unit: string;
  minQuantity: number;
  maxQuantity: number;
  refillSupported: boolean;
  cancelSupported: boolean;
  dripfeedSupported: boolean;
  isActiveUpstream: boolean;
}

export interface CatalogAdminItem {
  id: string;
  name: string;
  description: string | null;
  isVisible: boolean;
  displayOrder: number;
  category: { id: string; name: string; slug: string };
  provider: {
    providerServiceId: number;
    platform: string;
    rateUsd: string;
    unit: string;
    isActiveUpstream: boolean;
    minQuantity: number;
    maxQuantity: number;
  };
  minQuantity: number;
  maxQuantity: number;
  fxRateUsed: string;
  priceClientXof: string;
  costProviderXof: string;
  marginXof: string;
}

export interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  ordersCount: number;
}

export interface ExchangeRateRow {
  id: string;
  rateXofPerUsd: string;
  effectiveFrom: string;
}
