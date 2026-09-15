import { PricingRuleType } from "@prisma/client";
import { computePrice } from "./pricing.util";

describe("computePrice", () => {
  const fx = "615";

  it("applies a percent margin on top of the FX-converted cost", () => {
    const result = computePrice({
      pricingRuleType: PricingRuleType.PERCENT_MARGIN,
      pricingValue: 60,
      costUsd: 4.5,
      fxRateXofPerUsd: fx,
    });
    // 4.5 * 615 = 2767.5, * 1.6 = 4428
    expect(result.costProviderXof.toString()).toBe("2767.5");
    expect(result.priceClientXof.toString()).toBe("4428");
    expect(result.marginXof.toString()).toBe("1660.5");
  });

  it("adds a fixed margin regardless of cost size", () => {
    const result = computePrice({
      pricingRuleType: PricingRuleType.FIXED_MARGIN,
      pricingValue: 500,
      costUsd: 1,
      fxRateXofPerUsd: fx,
    });
    expect(result.priceClientXof.toString()).toBe("1115");
    expect(result.marginXof.toString()).toBe("500");
  });

  it("ignores cost entirely for a fixed price", () => {
    const result = computePrice({
      pricingRuleType: PricingRuleType.FIXED_PRICE,
      pricingValue: 1000,
      costUsd: 999,
      fxRateXofPerUsd: fx,
    });
    expect(result.priceClientXof.toString()).toBe("1000");
  });

  it("rounds up to the nearest step, never down (never undercharge)", () => {
    const result = computePrice({
      pricingRuleType: PricingRuleType.PERCENT_MARGIN,
      pricingValue: 60,
      costUsd: 4.5,
      fxRateXofPerUsd: fx,
      roundingStep: 5,
    });
    // Unrounded 4428 is already a multiple of ... let's pick a value that isn't.
    expect(result.priceClientXof.mod(5).toString()).toBe("0");
    expect(result.priceClientXof.gte(4428)).toBe(true);
  });

  it("clamps to the configured minimum price", () => {
    const result = computePrice({
      pricingRuleType: PricingRuleType.PERCENT_MARGIN,
      pricingValue: 10,
      costUsd: 0.01,
      fxRateXofPerUsd: fx,
      minPriceXof: 100,
    });
    expect(result.priceClientXof.toString()).toBe("100");
  });

  it("clamps to the configured maximum price", () => {
    const result = computePrice({
      pricingRuleType: PricingRuleType.PERCENT_MARGIN,
      pricingValue: 500,
      costUsd: 100,
      fxRateXofPerUsd: fx,
      maxPriceXof: 50_000,
    });
    expect(result.priceClientXof.toString()).toBe("50000");
  });
});
