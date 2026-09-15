import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TicketsService } from "./tickets.service";
import { TicketsController } from "./tickets.controller";

@Module({
  imports: [AuditLogModule, NotificationsModule],
  providers: [TicketsService],
  controllers: [TicketsController],
})
export class TicketsModule {}
