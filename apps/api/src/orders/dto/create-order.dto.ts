import { IsInt, IsPositive, IsString, IsUrl } from "class-validator";

export class CreateOrderDto {
  @IsString()
  catalogServiceId!: string;

  @IsUrl({ require_protocol: true })
  targetLink!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
