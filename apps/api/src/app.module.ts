import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { PanelFollowsModule } from "./panelfollows/panelfollows.module";
import { ExchangeRateModule } from "./exchange-rate/exchange-rate.module";
import { CategoriesModule } from "./categories/categories.module";
import { ProviderServicesModule } from "./provider-services/provider-services.module";
import { CatalogModule } from "./catalog/catalog.module";
import { YengapayModule } from "./yengapay/yengapay.module";
import { CryptomusModule } from "./cryptomus/cryptomus.module";
import { OrdersModule } from "./orders/orders.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { UsersModule } from "./users/users.module";
import { AdminModule } from "./admin/admin.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { InternalCronModule } from "./internal-cron/internal-cron.module";
import { CouponsModule } from "./coupons/coupons.module";
import { TicketsModule } from "./tickets/tickets.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    PanelFollowsModule,
    ExchangeRateModule,
    CategoriesModule,
    ProviderServicesModule,
    CatalogModule,
    YengapayModule,
    CryptomusModule,
    OrdersModule,
    WebhooksModule,
    UsersModule,
    AdminModule,
    AuditLogModule,
    InternalCronModule,
    CouponsModule,
    TicketsModule,
    NotificationsModule,
  ],
  providers: [
    // Runs before auth so a brute-force burst is rejected before it even reaches the DB-backed JWT check.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Secure by default: every route requires a valid JWT unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
