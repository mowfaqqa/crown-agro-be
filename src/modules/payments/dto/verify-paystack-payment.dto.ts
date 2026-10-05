import { IsString, Matches, MaxLength } from "class-validator";

export class VerifyPaystackPaymentDto {
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9._=-]+$/)
  reference: string;
}
