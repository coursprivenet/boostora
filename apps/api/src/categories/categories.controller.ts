import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { CategoriesService } from "./categories.service";
import { UpsertCategoryDto } from "./dto/upsert-category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  listPublic() {
    return this.categories.listPublic();
  }

  @Roles(UserRole.ADMIN)
  @Get("all")
  listAll() {
    return this.categories.listAll();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: UpsertCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categories.create(dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: Partial<UpsertCategoryDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categories.update(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.categories.remove(id, user.id);
  }
}
