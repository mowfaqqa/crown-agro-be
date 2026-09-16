import { Injectable, Logger } from "@nestjs/common";

type OrderCreatedNotification = {
  orderNumber: string;
  email: string;
  customerName: string;
  subtotal: number;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async orderCreated(payload: OrderCreatedNotification) {
    this.logger.log(`Order notification queued for ${payload.orderNumber} (${payload.email})`);
  }
}
