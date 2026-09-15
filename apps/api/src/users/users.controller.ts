import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
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
  updateRole(@Param("id") id: string, @Body() dto: UpdateUserRoleDto) {
    return this.users.updateRole(id, dto.role);
  }
}
