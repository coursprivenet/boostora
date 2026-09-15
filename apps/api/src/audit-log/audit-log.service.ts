import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget by design: an audit trail write must never block or fail the
   * admin action it's recording. Errors are logged, not thrown.
   */
  async record(
    userId: string | null,
    action: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, targetId, metadata: metadata as object },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log for action=${action}: ${(err as Error).message}`);
    }
  }

  async list(limit = 200) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
