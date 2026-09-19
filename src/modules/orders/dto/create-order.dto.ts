import { Type } from "class-transformer";
import { ArrayMinSize, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";

class CreateOrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  idempotencyKey!: string;

  @IsString()
  phone!: string;

  @IsString()
  deliveryCountry!: string;

  @IsString()
  deliveryAddress!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items!: CreateOrderItemDto[];
}
