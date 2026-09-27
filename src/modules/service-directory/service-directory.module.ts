import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ServiceDirectoryController } from "./service-directory.controller";
import { ServiceDirectoryService } from "./service-directory.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ServiceDirectoryController],
  providers: [ServiceDirectoryService]
})
export class ServiceDirectoryModule {}
