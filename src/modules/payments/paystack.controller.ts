import { Body, Controller, Headers, Param, Post, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { CustomerAuthGuard } from "../../common/guards/customer-auth.guard";
import { VerifyPaystackPaymentDto } from "./dto/verify-paystack-payment.dto";
import { PaystackService } from "./paystack.service";

type CustomerRequest = Request & { user: { id: string; email: string; emailVerified: boolean } };

@UseGuards(CustomerAuthGuard)
@Controller("orders")
export class PaystackController {
  constructor(private readonly paystackService: PaystackService) {}

  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post(":id/payment/initialize")
  initialize(@Param("id") id: string, @Req() request: CustomerRequest) {
    return this.paystackService.initialize(id, request.user);
  }

  @Throttle({ default: { ttl: 60_000, limit: 12 } })
  @Post(":id/payment/verify")
  verify(@Param("id") id: string, @Body() dto: VerifyPaystackPaymentDto, @Req() request: CustomerRequest) {
    return this.paystackService.verify(id, dto.reference, request.user.id);
  }
}

@Controller("payments/paystack")
export class PaystackWebhookController {
  constructor(private readonly paystackService: PaystackService) {}

  @Post("webhook")
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("x-paystack-signature") signature?: string
  ) {
    return this.paystackService.processWebhook(request.rawBody, signature);
  }
}
