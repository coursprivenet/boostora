import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { renderNotificationEmail } from "../email/email.templates";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Fire-and-forget, like AuditLogService and CouponsService.recordRedemption — a
   * notification is a side effect of something that already happened; it must never
   * roll back or block the real action (an order transition, a ticket reply) that
   * triggered it. Email rides along as a second channel on the same call rather than
   * being wired separately at each trigger point — one place decides "the user should
   * know about this", not two.
   */
  async notify(userId: string, type: string, title: string, body?: string, link?: string) {
    try {
      await this.prisma.notification.create({ data: { userId, type, title, body, link } });
    } catch (err) {
      this.logger.error(`Failed to create notification (${type}) for ${userId}: ${(err as Error).message}`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      await this.email.send(user.email, title, renderNotificationEmail(title, body ?? null, link ?? null));
    }
  }

  async listMine(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException("Notification introuvable");
    if (notification.userId !== userId) throw new ForbiddenException();
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }
}
