import { IsString, MinLength } from "class-validator";

export class EmailTokenDto {
  @IsString()
  @MinLength(32)
  token!: string;
}
