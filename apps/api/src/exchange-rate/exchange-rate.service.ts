import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExchangeRateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Latest admin-set rate, or the env default if none has ever been set. */
  async getCurrentRate(): Promise<Decimal> {
    const latest = await this.prisma.exchangeRate.findFirst({
      orderBy: { effectiveFrom: "desc" },
    });
    if (latest) return new Decimal(latest.rateXofPerUsd.toString());

    return new Decimal(this.config.get<string>("DEFAULT_XOF_PER_USD") ?? "615");
  }

  async setRate(rateXofPerUsd: number, setByUserId: string) {
    return this.prisma.exchangeRate.create({
      data: { rateXofPerUsd, setByUserId },
    });
  }

  async history(limit = 20) {
    return this.prisma.exchangeRate.findMany({
      orderBy: { effectiveFrom: "desc" },
      take: limit,
    });
  }
}
