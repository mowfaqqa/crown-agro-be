import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { InvestmentsController } from "./investments.controller";
import { InvestmentsService } from "./investments.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService]
})
export class InvestmentsModule {}
