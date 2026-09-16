import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from "class-validator";
import { PricingRuleType } from "@prisma/client";

export class UpsertCatalogServiceDto {
  @IsString()
  providerServiceId!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsString()
  riskWarning?: string;

  @IsEnum(PricingRuleType)
  pricingRuleType!: PricingRuleType;

  @Type(() => Number)
  @IsNumber()
  pricingValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  roundingStep?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minPriceXof?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxPriceXof?: number;

  @IsOptional()
  @IsInt()
  minQuantityOverride?: number;

  @IsOptional()
  @IsInt()
  maxQuantityOverride?: number;
}
