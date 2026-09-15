import { PricingRuleType } from "@prisma/client";
import Decimal from "decimal.js";

export interface PriceInputs {
  pricingRuleType: PricingRuleType;
  pricingValue: Decimal.Value;
  costUsd: Decimal.Value;
  fxRateXofPerUsd: Decimal.Value;
  roundingStep?: Decimal.Value | null;
  minPriceXof?: Decimal.Value | null;
  maxPriceXof?: Decimal.Value | null;
}

export interface PriceResult {
  priceClientXof: Decimal;
  costProviderXof: Decimal;
  marginXof: Decimal;
}

/**
 * Computes the client-facing XOF price from a provider cost in USD.
 * The provider cost is never derivable from the returned price alone in the API responses
 * we expose — callers must keep costProviderXof/marginXof server-side only.
 */
export function computePrice(inputs: PriceInputs): PriceResult {
  const costUsd = new Decimal(inputs.costUsd);
  const fxRate = new Decimal(inputs.fxRateXofPerUsd);
  const costProviderXof = costUsd.mul(fxRate);
  const value = new Decimal(inputs.pricingValue);

  let priceClientXof: Decimal;
  switch (inputs.pricingRuleType) {
    case PricingRuleType.FIXED_PRICE:
      priceClientXof = value;
      break;
    case PricingRuleType.PERCENT_MARGIN:
      // value is a percent, e.g. 60 means cost * 1.60
      priceClientXof = costProviderXof.mul(new Decimal(1).plus(value.div(100)));
      break;
    case PricingRuleType.FIXED_MARGIN:
      priceClientXof = costProviderXof.plus(value);
      break;
    default: {
      const _exhaustive: never = inputs.pricingRuleType;
      throw new Error(`Unhandled pricing rule type: ${_exhaustive}`);
    }
  }

  if (inputs.roundingStep) {
    const step = new Decimal(inputs.roundingStep);
    if (step.gt(0)) {
      priceClientXof = priceClientXof.div(step).ceil().mul(step);
    }
  }

  if (inputs.minPriceXof != null) {
    const min = new Decimal(inputs.minPriceXof);
    if (priceClientXof.lt(min)) priceClientXof = min;
  }
  if (inputs.maxPriceXof != null) {
    const max = new Decimal(inputs.maxPriceXof);
    if (priceClientXof.gt(max)) priceClientXof = max;
  }

  return {
    priceClientXof,
    costProviderXof,
    marginXof: priceClientXof.minus(costProviderXof),
  };
}
