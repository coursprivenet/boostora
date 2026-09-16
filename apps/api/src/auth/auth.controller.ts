import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthenticatedUser } from "./strategies/jwt.strategy";

// Credential-guessing surface — much tighter than the API-wide default.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
    return { message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { message: "Mot de passe mis à jour." };
  }

  @Patch("me")
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Patch("me/password")
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.auth.changePassword(user.id, dto);
  }
}
