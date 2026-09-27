import { ServiceEnquiryStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateServiceEnquiryDto {
  @IsEnum(ServiceEnquiryStatus)
  status!: ServiceEnquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
