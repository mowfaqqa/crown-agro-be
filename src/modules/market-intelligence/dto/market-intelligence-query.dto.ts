import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { MarketInsightType } from "@prisma/client";

export class MarketIntelligenceQueryDto {
  @IsOptional()
  @IsEnum(MarketInsightType)
  type?: MarketInsightType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
