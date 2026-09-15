import { Controller, Get } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuditLogService } from "./audit-log.service";

@Controller("admin/audit-logs")
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  list() {
    return this.auditLog.list();
  }
}
