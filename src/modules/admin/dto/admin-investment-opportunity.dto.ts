import { InvestmentCategory } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from "class-validator";

export class UpsertInvestmentOpportunityDto {
  @IsString()
  @MinLength(4)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  slug!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(360)
  summary!: string;

  @IsString()
  @MinLength(40)
  @MaxLength(12000)
  description!: string;

  @IsEnum(InvestmentCategory)
  category!: InvestmentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @Transform(({ value }) => value === "" ? undefined : value)
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fundingTarget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumInterestAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMonths?: number;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  riskSummary!: string;

  @IsBoolean()
  featured!: boolean;

  @IsBoolean()
  openForInterest!: boolean;

  @IsBoolean()
  published!: boolean;
}
