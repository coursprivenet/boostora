import { IsNumber, IsOptional, IsPositive } from "class-validator";

export class SetExchangeRateDto {
  @IsNumber()
  @IsPositive()
  rateXofPerUsd!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  costRateXofPerUsd?: number;
}
