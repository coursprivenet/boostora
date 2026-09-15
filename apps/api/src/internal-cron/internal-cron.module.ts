import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { InternalCronController } from "./internal-cron.controller";
import { CronSecretGuard } from "./cron-secret.guard";

@Module({
  imports: [OrdersModule],
  controllers: [InternalCronController],
  providers: [CronSecretGuard],
})
export class InternalCronModule {}
