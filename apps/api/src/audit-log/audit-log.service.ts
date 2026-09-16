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

  /**
   * userId has no FK relation on purpose — an audit entry must survive the actor's
   * account being deleted. Emails are resolved separately and joined in memory.
   */
  async list(limit = 200) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    return logs.map((log) => ({
      ...log,
      actorEmail: log.userId ? (emailById.get(log.userId) ?? "Compte supprimé") : "Système",
    }));
  }
}
