import { InvestmentCategory } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class InvestmentQueryDto {
  @IsOptional()
  @IsEnum(InvestmentCategory)
  category?: InvestmentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}
