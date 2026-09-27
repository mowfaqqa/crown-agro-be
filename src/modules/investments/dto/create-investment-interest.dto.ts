import { InvestorType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreateInvestmentInterestDto {
  @IsEnum(InvestorType)
  investorType!: InvestorType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizationName?: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  indicativeAmount?: number;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  message!: string;
}
