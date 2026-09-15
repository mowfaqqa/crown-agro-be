import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Min, ValidateNested } from "class-validator";
import { Category } from "@prisma/client";

class BulkPriceDto {
  @IsInt()
  @Min(1)
  minQuantity!: number;

  @IsInt()
  @Min(1)
  unitPrice!: number;
}

export class UpsertProductDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  compareAtPrice?: number;

  @IsEnum(Category)
  category!: Category;

  @IsString()
  countryOfOrigin!: string;

  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @IsString()
  unit!: string;

  @IsUrl({ require_tld: false })
  imageUrl!: string;

  @IsBoolean()
  halalCertified!: boolean;

  @IsBoolean()
  exportCertified!: boolean;

  @IsBoolean()
  featured!: boolean;

  @IsString()
  sellerName!: string;

  @IsString()
  sellerCountry!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkPriceDto)
  bulkPricing!: BulkPriceDto[];
}
