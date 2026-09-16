import { Equals, IsInt, IsOptional, IsPositive, IsString, IsUrl } from "class-validator";

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

  /** Must be explicitly true — enforced server-side, not just a disabled checkout button. */
  @Equals(true)
  acceptedTerms!: boolean;
}
