import { IsIn } from "class-validator";

export class ChangePaymentCountryDto {
  @IsIn(["BF", "CI", "BJ", "OTHER"])
  paymentCountryCode!: "BF" | "CI" | "BJ" | "OTHER";
}
