import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TicketStatus, UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { TicketsService } from "./tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

@Controller("tickets")
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.tickets.listMine(user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @Get("admin")
  listAll(@Query("status") status?: TicketStatus) {
    return this.tickets.listAll(status);
  }

  @Get(":id")
  getOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tickets.getOne(user.id, user.role, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.tickets.create(user.id, dto);
  }

  @Post(":id/messages")
  addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.tickets.addMessage(user.id, user.role, id, dto.body);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.tickets.updateStatus(user.id, id, dto.status);
  }
}
