import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";

@Injectable()
export class ExchangeRateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Latest admin-set rate, or the env default if none has ever been set. */
  async getCurrentRate(): Promise<Decimal> {
    const latest = await this.prisma.exchangeRate.findFirst({
      orderBy: { effectiveFrom: "desc" },
    });
    if (latest) return new Decimal(latest.rateXofPerUsd.toString());

    return new Decimal(this.config.get<string>("DEFAULT_XOF_PER_USD") ?? "615");
  }

  async getCurrentCostRate(): Promise<Decimal> {
    const latest = await this.prisma.exchangeRate.findFirst({ orderBy: { effectiveFrom: "desc" } });
    return new Decimal(latest?.costRateXofPerUsd?.toString() ?? this.config.get<string>("DEFAULT_COST_XOF_PER_USD") ?? "615");
  }

  async getCurrentRates() {
    const [rateXofPerUsd, costRateXofPerUsd] = await Promise.all([this.getCurrentRate(), this.getCurrentCostRate()]);
    return { rateXofPerUsd, costRateXofPerUsd };
  }

  async setRate(rateXofPerUsd: number, setByUserId: string, costRateXofPerUsd?: number) {
    const costRate = costRateXofPerUsd ?? await this.getCurrentCostRate();
    const created = await this.prisma.exchangeRate.create({
      data: { rateXofPerUsd, costRateXofPerUsd: costRate, setByUserId },
    });
    await this.auditLog.record(setByUserId, "exchange_rate.set", created.id, { rateXofPerUsd, costRateXofPerUsd: costRate });
    return created;
  }

  async history(limit = 20) {
    return this.prisma.exchangeRate.findMany({
      orderBy: { effectiveFrom: "desc" },
      take: limit,
    });
  }
}
