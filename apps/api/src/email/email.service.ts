import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.from = this.config.get<string>("EMAIL_FROM") ?? "Boostora <onboarding@resend.dev>";
    // Optional by design: email is a secondary channel on top of in-app notifications
    // (NotificationsService already covers every trigger) — the app must keep working
    // for everything else before Resend is even set up.
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend) {
      this.logger.warn("RESEND_API_KEY not set — email sending is disabled (in-app notifications still work).");
    }
  }

  /**
   * Fire-and-forget, like every other notification side effect in this app — an email
   * failure (unverified domain, recipient not the account owner yet, provider outage)
   * must never affect the real action that triggered it.
   */
  async send(to: string, subject: string, html: string) {
    if (!this.resend) return;
    try {
      const result = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (result.error) {
        this.logger.warn(`Resend rejected email to ${to}: ${result.error.message}`);
      } else {
        this.logger.log(`Resend accepted email to ${to}, id=${result.data?.id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }
}
