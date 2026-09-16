import { IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

export class RefundOrderDto {
  /** Optional — defaults to the full payment amount when omitted (partial refund otherwise). */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountXof?: number;

  @IsString()
  @MinLength(3)
  reason!: string;
}
