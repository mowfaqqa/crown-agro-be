import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  halal?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  exportCertified?: boolean;

  @IsOptional()
  @IsIn(["all", "in_stock", "out_of_stock"])
  availability: "all" | "in_stock" | "out_of_stock" = "all";

  @IsOptional()
  @IsIn(["featured", "newest", "price_asc", "price_desc", "name_asc"])
  sort: "featured" | "newest" | "price_asc" | "price_desc" | "name_asc" = "featured";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit = 12;
}
