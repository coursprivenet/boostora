import { Equals, IsIn, IsInt, IsOptional, IsPositive, IsString, IsUrl } from "class-validator";

export class CreateOrderDto {
  @IsString()
  catalogServiceId!: string;

  @IsUrl({ require_protocol: true })
  targetLink!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  /** Both required together when set — validated in OrdersService against the
   * provider service's own dripfeedSupported flag and its declared runs/interval max. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  dripfeedRuns?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  dripfeedIntervalMinutes?: number;

  /** Must be explicitly true — enforced server-side, not just a disabled checkout button. */
  @Equals(true)
  acceptedTerms!: boolean;

  /** BF uses YengaPay Direct; CI/BJ use Checkout. Other countries can use crypto. */
  @IsOptional()
  @IsIn(["BF", "CI", "BJ", "OTHER"])
  paymentCountryCode?: "BF" | "CI" | "BJ" | "OTHER";

}
