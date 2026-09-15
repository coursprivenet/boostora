import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Module({
  imports: [AuditLogModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
