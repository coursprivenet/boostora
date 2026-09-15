import { IsString, MinLength } from "class-validator";

export class SendOtpDto {
  @IsString()
  operatorCode!: string;

  @IsString()
  countryCode!: string;

  @IsString()
  @MinLength(6)
  customerMSISDN!: string;
}
