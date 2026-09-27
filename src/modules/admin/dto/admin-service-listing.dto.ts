import { ServiceCategory } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class UpsertServiceListingDto {
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

  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  providerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @Transform(({ value }) => value === "" ? undefined : value)
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsBoolean()
  featured!: boolean;

  @IsBoolean()
  published!: boolean;
}
