import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
import { OrdersModule } from "./orders/orders.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PanelFollowsModule,
    ExchangeRateModule,
    CategoriesModule,
    ProviderServicesModule,
    CatalogModule,
    YengapayModule,
    OrdersModule,
    WebhooksModule,
  ],
  providers: [
    // Secure by default: every route requires a valid JWT unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
