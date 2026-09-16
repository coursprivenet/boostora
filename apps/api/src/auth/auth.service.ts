import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { renderNotificationEmail } from "../email/email.templates";
import { AuditLogService } from "../audit-log/audit-log.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Un compte existe déjà avec cet email");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, phone: dto.phone, passwordHash },
    });

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  /**
   * Always resolves the same way regardless of whether the email exists — the controller
   * response must not let a caller enumerate registered accounts.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return;

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    // Invalidate any still-usable tokens from earlier requests so only the latest email works.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const html = renderNotificationEmail(
      "Réinitialisation de mot de passe",
      "Tu as demandé à réinitialiser ton mot de passe Boostora. Ce lien expire dans 30 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email.",
      `/reset-password?token=${rawToken}`,
    );
    void this.email.send(user.email, "Réinitialisation de mot de passe — Boostora", html);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash("sha256").update(dto.token).digest("hex");
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException("Lien invalide ou expiré");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { phone: dto.phone },
      select: { id: true, email: true, phone: true, role: true, createdAt: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedException("Mot de passe actuel incorrect");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    await this.auditLog.record(userId, "user.password_change", userId);

    // The caller's own current token would otherwise die the instant passwordChangedAt
    // passes its iat — hand back a fresh one so their session survives the change.
    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  /**
   * Kills every other session without touching the password — for "I think someone else
   * is on my account" without the friction of also picking a new password. Reuses the
   * exact same passwordChangedAt cutoff JwtStrategy already checks.
   */
  async logoutAllSessions(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordChangedAt: new Date() },
    });
    await this.auditLog.record(userId, "user.logout_all_sessions", userId);

    // Same reasoning as changePassword: this action invalidates the caller's own token too.
    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  private buildAuthResponse(id: string, email: string, role: string) {
    const accessToken = this.jwt.sign({ sub: id, role });
    return {
      accessToken,
      user: { id, email, role },
    };
  }
}
