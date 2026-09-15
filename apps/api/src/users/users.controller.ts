import { Body, Controller, ForbiddenException, Get, Param, Patch } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { UsersService } from "./users.service";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

@Controller("users")
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  listAll() {
    return this.users.listAll();
  }

  @Patch(":id/role")
  updateRole(
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    // Enforced server-side, not just hidden in the UI — an admin locking themselves out
    // (or worse, self-demoting under duress) has no recovery path short of a DB script.
    if (id === actor.id) {
      throw new ForbiddenException("Impossible de modifier son propre rôle");
    }
    return this.users.updateRole(id, dto.role, actor.id);
  }
}
