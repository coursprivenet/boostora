import { IsInt, IsPositive, IsString } from "class-validator";

export class PreviewCouponDto {
  @IsString()
  code!: string;

  @IsString()
  catalogServiceId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
