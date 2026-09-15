export enum PricingRuleType {
  FIXED_PRICE = "FIXED_PRICE",
  PERCENT_MARGIN = "PERCENT_MARGIN",
  FIXED_MARGIN = "FIXED_MARGIN",
}

export interface PricingRule {
  type: PricingRuleType;
  /** Percent as 0-100 for PERCENT_MARGIN, XOF amount for FIXED_MARGIN/FIXED_PRICE. */
  value: number;
  roundingStep?: number;
  minPriceXof?: number;
  maxPriceXof?: number;
}
