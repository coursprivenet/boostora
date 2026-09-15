import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { TicketStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPPORT];

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMine(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: { order: { select: { id: true, catalogService: { select: { name: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  /** Staff view: every ticket, optionally filtered by status. */
  async listAll(status?: TicketStatus) {
    return this.prisma.ticket.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { email: true } },
        order: { select: { id: true, catalogService: { select: { name: true } } } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getOne(actorUserId: string, actorRole: UserRole, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { select: { id: true, catalogService: { select: { name: true } } } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, email: true, role: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Ticket introuvable");
    this.assertCanAccess(ticket.userId, actorUserId, actorRole);
    return ticket;
  }

  async create(userId: string, dto: CreateTicketDto) {
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
      if (!order || order.userId !== userId) {
        throw new BadRequestException("Commande invalide");
      }
    }

    return this.prisma.ticket.create({
      data: {
        userId,
        orderId: dto.orderId,
        subject: dto.subject,
        messages: { create: { authorUserId: userId, body: dto.body } },
      },
      include: { messages: true },
    });
  }

  async addMessage(actorUserId: string, actorRole: UserRole, ticketId: string, body: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket introuvable");
    this.assertCanAccess(ticket.userId, actorUserId, actorRole);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException("Ce ticket est fermé — un membre du support doit le rouvrir");
    }

    const isStaff = STAFF_ROLES.includes(actorRole);
    const [message] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { ticketId, authorUserId: actorUserId, body },
        include: { author: { select: { id: true, email: true, role: true } } },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        // A staff reply to a fresh OPEN ticket moves it forward automatically;
        // a client reply never changes status on its own.
        data: isStaff && ticket.status === TicketStatus.OPEN
          ? { status: TicketStatus.IN_PROGRESS }
          : {},
      }),
    ]);

    if (isStaff) {
      await this.notifications.notify(
        ticket.userId,
        "ticket.reply",
        "Nouvelle réponse du support",
        `Sujet : ${ticket.subject}`,
        `/dashboard/support/${ticket.id}`,
      );
    }
    return message;
  }

  async updateStatus(actorUserId: string, ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket introuvable");

    const updated = await this.prisma.ticket.update({ where: { id: ticketId }, data: { status } });
    await this.auditLog.record(actorUserId, "ticket.status_change", ticketId, {
      from: ticket.status,
      to: status,
    });
    return updated;
  }

  private assertCanAccess(ownerUserId: string, actorUserId: string, actorRole: UserRole) {
    if (ownerUserId === actorUserId) return;
    if (STAFF_ROLES.includes(actorRole)) return;
    throw new ForbiddenException("Accès refusé à ce ticket");
  }
}
