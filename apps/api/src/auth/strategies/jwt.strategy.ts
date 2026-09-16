import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  /** Standard JWT claim, seconds since epoch — passport-jwt decodes it onto the payload. */
  iat: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET")!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Re-read the user on every request rather than trusting the token body verbatim,
    // so a revoked/role-changed account is rejected immediately instead of at next login.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("Compte introuvable");
    }
    // JWT iat has 1-second resolution; passwordChangedAt has millisecond resolution. Comparing
    // them directly means a token minted in the very same second as the password change (e.g.
    // the fresh one changePassword/logoutAllSessions hands back) can have an iat that floors to
    // *before* passwordChangedAt's sub-second value and gets wrongly rejected. Floor
    // passwordChangedAt to the second too — a 1-second-coarser cutoff, but race-free.
    const passwordChangedAtSec = user.passwordChangedAt
      ? Math.floor(user.passwordChangedAt.getTime() / 1000)
      : null;
    if (passwordChangedAtSec !== null && payload.iat < passwordChangedAtSec) {
      throw new UnauthorizedException("Session expirée suite au changement de mot de passe");
    }
    return { id: user.id, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt };
  }
}
