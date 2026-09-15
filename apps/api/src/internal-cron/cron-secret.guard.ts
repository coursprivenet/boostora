import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is set as a
 * project env var — see vercel.com/docs/cron-jobs/manage-cron-jobs. Nothing else should
 * ever be able to trigger these routes, so this guard is deliberately separate from the
 * JWT/role guards (they're marked @Public() to bypass those entirely).
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expected = this.config.get<string>("CRON_SECRET");
    const header = request.headers["authorization"];

    if (!expected || header !== `Bearer ${expected}`) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
