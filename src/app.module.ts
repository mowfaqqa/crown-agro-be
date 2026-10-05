import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { NewsletterModule } from "./modules/newsletter/newsletter.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ProductsModule } from "./modules/products/products.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { MarketIntelligenceModule } from "./modules/market-intelligence/market-intelligence.module";
import { ServiceDirectoryModule } from "./modules/service-directory/service-directory.module";
import { InvestmentsModule } from "./modules/investments/investments.module";
import { MediaModule } from "./modules/media/media.module";
import { PaymentsModule } from "./modules/payments/payments.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 80
      }
    ]),
    PrismaModule,
    AuthModule,
    CustomersModule,
    MarketIntelligenceModule,
    ServiceDirectoryModule,
    InvestmentsModule,
    MediaModule,
    PaymentsModule,
    ProductsModule,
    OrdersModule,
    NotificationsModule,
    NewsletterModule,
    AdminModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
