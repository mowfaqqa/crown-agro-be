import { InvestmentInterestStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateInvestmentInterestDto {
  @IsEnum(InvestmentInterestStatus)
  status!: InvestmentInterestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
