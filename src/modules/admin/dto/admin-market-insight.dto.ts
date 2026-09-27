import { MarketInsightType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class UpsertMarketInsightDto {
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
  content!: string;

  @IsEnum(MarketInsightType)
  type!: MarketInsightType;

  @IsOptional()
  @Transform(({ value }) => value === "" ? undefined : value)
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  commodity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dataValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceName?: string;

  @IsOptional()
  @Transform(({ value }) => value === "" ? undefined : value)
  @IsUrl({ require_tld: true })
  sourceUrl?: string;

  @IsBoolean()
  featured!: boolean;

  @IsBoolean()
  published!: boolean;
}
