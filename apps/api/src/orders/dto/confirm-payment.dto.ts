import { IsString, MinLength } from "class-validator";

export class ConfirmPaymentDto {
  @IsString()
  operatorCode!: string;

  @IsString()
  countryCode!: string;

  @IsString()
  @MinLength(6)
  customerMSISDN!: string;

  @IsString()
  @MinLength(4)
  otp!: string;
}
