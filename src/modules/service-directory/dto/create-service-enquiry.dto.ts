import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateServiceEnquiryDto {
  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  message!: string;
}
