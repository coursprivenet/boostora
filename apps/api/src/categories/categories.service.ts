import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { UpsertCategoryDto } from "./dto/upsert-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  listPublic() {
    return this.prisma.category.findMany({
      where: { isVisible: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  listAll() {
    return this.prisma.category.findMany({ orderBy: { displayOrder: "asc" } });
  }

  async create(dto: UpsertCategoryDto, actorUserId: string) {
    const created = await this.prisma.category.create({ data: dto });
    await this.auditLog.record(actorUserId, "category.create", created.id, { name: dto.name });
    return created;
  }

  async update(id: string, dto: Partial<UpsertCategoryDto>, actorUserId: string) {
    await this.ensureExists(id);
    const updated = await this.prisma.category.update({ where: { id }, data: dto });
    await this.auditLog.record(actorUserId, "category.update", id, dto as Record<string, unknown>);
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureExists(id);
    const removed = await this.prisma.category.delete({ where: { id } });
    await this.auditLog.record(actorUserId, "category.delete", id);
    return removed;
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Catégorie introuvable");
  }
}
