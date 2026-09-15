import { Controller, Post, UseGuards } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { CronSecretGuard } from "./cron-secret.guard";
import { ProviderReconciliationService } from "../orders/provider-reconciliation.service";

@Controller("internal/cron")
@Public()
@UseGuards(CronSecretGuard)
export class InternalCronController {
  constructor(private readonly reconciliation: ProviderReconciliationService) {}

  @Post("reconcile-orders")
  reconcileOrders() {
    return this.reconciliation.reconcileActiveOrders();
  }

  @Post("retry-submissions")
  retrySubmissions() {
    return this.reconciliation.retryStuckSubmissions();
  }

  @Post("expire-payments")
  expirePayments() {
    return this.reconciliation.expireAbandonedPayments();
  }
}
