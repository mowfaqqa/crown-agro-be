import { IsEmail, IsString } from "class-validator";

export class LookupOrderDto {
  @IsString()
  orderNumber!: string;

  @IsEmail()
  email!: string;
}
