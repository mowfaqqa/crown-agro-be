import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PaystackController, PaystackWebhookController } from "./paystack.controller";
import { PaystackService } from "./paystack.service";

@Module({
  imports: [AuthModule],
  controllers: [PaystackController, PaystackWebhookController],
  providers: [PaystackService]
})
export class PaymentsModule {}
