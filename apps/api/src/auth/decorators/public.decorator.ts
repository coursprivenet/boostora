import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Opt out of the global JwtAuthGuard for a route (e.g. login, register, webhooks, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
