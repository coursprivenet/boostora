import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { CouponDiscountType } from "@prisma/client";

export class UpsertCouponDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[A-Z0-9_-]+$/, { message: "code must be uppercase alphanumeric, - or _" })
  code!: string;

  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  value!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxUses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minOrderXof?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
