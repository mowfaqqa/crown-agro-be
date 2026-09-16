import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateOrderNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fulfillmentNotes?: string;
}
