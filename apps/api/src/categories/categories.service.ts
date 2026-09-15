import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertCategoryDto } from "./dto/upsert-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.category.findMany({
      where: { isVisible: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  listAll() {
    return this.prisma.category.findMany({ orderBy: { displayOrder: "asc" } });
  }

  create(dto: UpsertCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: Partial<UpsertCategoryDto>) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.category.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Catégorie introuvable");
  }
}
