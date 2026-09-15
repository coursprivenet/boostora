import { IsNumber, IsPositive } from "class-validator";

export class SetExchangeRateDto {
  @IsNumber()
  @IsPositive()
  rateXofPerUsd!: number;
}
